
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { toast } from 'react-toastify';
import { getApiUrl } from './lib/apiConfig';

const API_BASE_URL = getApiUrl('login.php');

export default function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaQuestion, setCaptchaQuestion] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Auto-show captcha once both username and password are filled
  useEffect(() => {
    if (username.trim() && password.trim() && !showCaptcha) {
      setShowCaptcha(true);
      generateCaptcha();
    }
  }, [username, password]);

  const generateCaptcha = async () => {
    try {
      console.log('Generating captcha...');
      const response = await axios.post(API_BASE_URL, {
        action: "generate_captcha"
      });
      
      console.log('Captcha API response:', response.data);
      
      if (response.data.success) {
        setCaptchaQuestion(response.data.question);
        setCaptchaAnswer(response.data.answer.toString());
        console.log('Captcha set:', response.data.question, 'Answer:', response.data.answer);
      } else {
        console.error('Captcha API failed:', response.data);
        // Use fallback if API returns success: false
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        setCaptchaQuestion(`What is ${num1} + ${num2}?`);
        setCaptchaAnswer((num1 + num2).toString());
        console.log('Using fallback captcha:', `${num1} + ${num2} = ${num1 + num2}`);
      }
    } catch (err) {
      console.error('Captcha generation error:', err);
      
      // Fallback captcha if API fails
      const num1 = Math.floor(Math.random() * 10) + 1;
      const num2 = Math.floor(Math.random() * 10) + 1;
      setCaptchaQuestion(`What is ${num1} + ${num2}?`);
      setCaptchaAnswer((num1 + num2).toString());
      console.log('Using fallback captcha due to error:', `${num1} + ${num2} = ${num1 + num2}`);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!username.trim() || !password.trim()) {
      const msg = "Both username and password are required";
      setError(msg);
      toast.error(msg);
      return;
    }

    // If this is the first login attempt, show captcha
    if (!showCaptcha) {
      setShowCaptcha(true);
      generateCaptcha(); // Generate new captcha when showing for first time
      return;
    }

    // Validate captcha
    if (!captchaInput.trim()) {
      const msg = "Please complete the captcha";
      setError(msg);
      toast.error(msg);
      return;
    }

    // Debug: Log captcha values
    
    
    
    
    if (captchaInput.toString() !== captchaAnswer.toString()) {
      const msg = "Incorrect captcha answer. Please try again.";
      setError(msg);
      toast.error(msg);
      setCaptchaInput("");
      generateCaptcha();
      return;
    }

    setLoading(true);

    try {

      
      const res = await axios.post(API_BASE_URL, {
        action: "login",
        username: username,
        password: password,
        captcha: captchaInput,
        captchaAnswer: captchaAnswer,
        // Provide route hint so backend can map location/terminal and save shift
        route: typeof window !== 'undefined' ? window.location.pathname || '/admin' : '/admin'
      });

      

      if (res.data.success) {
        const role = res.data.role;

        // Store user data in sessionStorage for use across the app
        sessionStorage.setItem('user_data', JSON.stringify({
          user_id: res.data.user_id,
          username: username,
          role: role,
          full_name: res.data.full_name,
          terminal_id: res.data.terminal_id || null,
          terminal_name: res.data.terminal_name || null,
          location: res.data.location || null,
          shift_id: res.data.shift_id || null
        }));

        // Also persist terminal for POS
        if (typeof window !== 'undefined') {
          if (res.data.terminal_name) localStorage.setItem('pos-terminal', res.data.terminal_name);
          if (res.data.full_name) localStorage.setItem('pos-cashier', res.data.full_name);
          if (res.data.user_id) localStorage.setItem('pos-emp-id', String(res.data.user_id));
        }

        toast.success(`Login successful. Welcome ${res.data.full_name}!`);
        

        // Robust role-based redirect (map pharmacist into Inventory app)
        const normalizedRole = (role || '').toString().toLowerCase();
        let target = '/admin';
        if (normalizedRole.includes('admin')) {
          target = '/admin';
        } else if (normalizedRole.includes('cashier') || normalizedRole.includes('pos')) {
          target = '/POS_convenience';
        } else if (normalizedRole.includes('Pharmacy Cashier') || normalizedRole.includes('inventory')) {
          target = '/Inventory_Con';
        } else if (normalizedRole) {
          // Unknown but present role → send to Inventory as safe default
          target = '/Inventory_Con';
        } else {
          toast.warn('No role detected. Redirecting to admin.');
        }

        // Terminal/location is now handled automatically in the login process

        // Try router push, then hard redirect fallback
        router.push(target);
        setTimeout(() => {
          if (typeof window !== 'undefined' && window?.location?.pathname === '/') {
            window.location.href = target;
          }
        }, 500);
      } else {
        const msg = res.data.message || "Invalid username or password.";
        setError(msg);
        toast.error(msg === 'User is inactive. Please contact the administrator.' ? 'User is inactive. Please contact the administrator.' : msg);
        setPassword(""); // Clear password field on error
        setCaptchaInput(""); // Clear captcha input
        generateCaptcha(); // Generate new captcha
      }
    } catch (err) {
      
      const msg = "An unexpected error occurred. Please check your connection.";
      setError(msg);
      toast.error(msg);
      setPassword(""); // Clear password field on error
      setCaptchaInput(""); // Clear captcha input
      generateCaptcha(); // Generate new captcha
    } finally {
      setLoading(false);
    }
  };

  const handleTryAgain = () => {
    setShowCaptcha(false);
    setCaptchaInput("");
    setError("");
    generateCaptcha();
  };

  const handleBackToLogin = () => {
    setShowCaptcha(false);
    setCaptchaInput("");
    setError("");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="w-full max-w-md">
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-2xl p-6 md:p-8 space-y-6 max-h-[85vh] overflow-y-auto"
        >
          <div className="text-center flex flex-col items-center gap-2">
            <img
              src="/assets/enguio_logo.png"
              alt="logo"
              className="w-30 h-30 object-contain mx-auto"
            />
            <p className="text-gray-800">Please sign in to your account</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-center text-sm">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-900 mb-2">
              Username
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors text-gray-900 placeholder-gray-500 bg-white"
              placeholder="Enter your username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-900 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 pr-12 border border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-colors text-gray-900 placeholder-gray-500 bg-white"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 focus:outline-none"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Manual captcha trigger button */}
          {!showCaptcha && username.trim() && password.trim() && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowCaptcha(true);
                  generateCaptcha();
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Show Security Check
              </button>
            </div>
          )}

          {/* Force captcha generation button for debugging */}
          {showCaptcha && (
            <div className="text-center mb-2">
              <button
                type="button"
                onClick={generateCaptcha}
                className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
              >
                Regenerate Captcha
              </button>
            </div>
          )}

          {showCaptcha && (
            <div
              className={`${(captchaInput.trim() && captchaInput.toString() === captchaAnswer.toString())
                ? 'bg-green-50 border-green-300'
                : (captchaInput.trim() && captchaInput.toString() !== captchaAnswer.toString())
                  ? 'bg-red-50 border-red-300'
                  : 'bg-blue-50 border-blue-200'} p-4 rounded-lg border`}
            >
              <div className="text-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Security Verification</h3>
                <p className="text-sm text-gray-700">Please complete this security check</p>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-blue-300 mb-3">
                <p className="text-center text-lg font-medium text-gray-800">
                  {captchaQuestion || 'Loading security question...'}
                </p>
              </div>
              
              <input
                type="text"
                value={captchaInput}
                onChange={(e) => setCaptchaInput(e.target.value)}
                placeholder="Enter your answer"
                required
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 mb-2 text-gray-900 placeholder-gray-500 bg-white ${
                  captchaInput.trim()
                    ? (captchaInput.toString() === captchaAnswer.toString()
                        ? 'border-green-400 focus:ring-green-500 focus:border-green-500 bg-green-50'
                        : 'border-red-400 focus:ring-red-500 focus:border-red-500 bg-red-50')
                    : 'border-gray-400 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={handleTryAgain}
                  className="flex-1 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  New Question
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="flex-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 text-white bg-gradient-to-r from-green-600 to-green-700 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-lg shadow-lg"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Logging in...
              </div>
            ) : showCaptcha ? (
              "Login"
            ) : (
              "Continue"
            )}
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-700">
              Secure login with captcha verification
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
