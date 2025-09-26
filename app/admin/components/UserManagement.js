"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from './ThemeContext';

const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

// Helper function to convert text to title case
const toTitleCaseLoose = (str) => {
  if (!str) return '';
  return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
};

function UserManagement() { 
  const { theme } = useTheme();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    fname: "",
    mname: "",
    lname: "",
    gender: "",
    birthdate: "",
    email: "",
    contact: "",
    role: "",
    shift: "",
    age: "",
    address: "",
    username: "",
    password: "",
  });
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [showPassword, setShowPassword] = useState(false);
  const [roles, setRoles] = useState({});
  const [shifts, setShifts] = useState({});
  const [rolesList, setRolesList] = useState([]);
  const [shiftsList, setShiftsList] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchRolesAndShifts();
  }, []);

  const fetchRolesAndShifts = async () => {
    try {
      // Fetch roles
      const rolesResponse = await axios.post(API_BASE_URL, {
        action: "get_roles"
      });
      if (rolesResponse.data.success) {
        const roleMap = {};
        rolesResponse.data.data.forEach(role => {
          roleMap[role.role_id] = role.role;
        });
        setRoles(roleMap);
        setRolesList(rolesResponse.data.data);
      }

      // Fetch shifts
      const shiftsResponse = await axios.post(API_BASE_URL, {
        action: "get_shifts"
      });
      if (shiftsResponse.data.success) {
        const shiftMap = {};
        shiftsResponse.data.data.forEach(shift => {
          shiftMap[shift.shift_id] = shift.shift_name;
        });
        setShifts(shiftMap);
        setShiftsList(shiftsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching roles and shifts:', error);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "display_employee"
      });
      if (response.data.success) {
        // Transform employee data to match the expected format
        const transformedUsers = response.data.employees.map(emp => ({
          id: emp.emp_id,
          fname: emp.Fname,
          mname: emp.Mname,
          lname: emp.Lname,
          email: emp.email,
          contact: emp.contact_num,
          role: emp.role_id, // This will be the role ID, we'll need to map it
          shift: emp.shift_id, // This will be the shift ID, we'll need to map it
          age: emp.age,
          address: emp.address,
          username: emp.username,
          status: emp.status,
          gender: emp.gender,
          birthdate: emp.birthdate
        }));
        setUsers(transformedUsers);
      } else {
        setUsers([]);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'fname' || name === 'mname' || name === 'lname') {
      setFormData({ ...formData, [name]: toTitleCaseLoose(value) });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "add_employee",
        fname: formData.fname,
        mname: formData.mname,
        lname: formData.lname,
        gender: formData.gender,
        birthdate: formData.birthdate,
        email: formData.email,
        contact_num: formData.contact,
        role_id: formData.role,
        shift_id: formData.shift,
        age: formData.age,
        address: formData.address,
        username: formData.username,
        password: formData.password
      });
      
      if (response.data.success) {
        toast.success('Employee added successfully!');
        setShowModal(false);
        setFormData({
          fname: "",
          mname: "",
          lname: "",
          gender: "",
          birthdate: "",
          email: "",
          contact: "",
          role: "",
          shift: "",
          age: "",
          address: "",
          username: "",
          password: "",
        });
        fetchUsers();
      } else {
        toast.error(response.data.message || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Error adding employee:', error);
      toast.error('Error adding employee');
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search term and role
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.fname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.lname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const userRoleName = roles[user.role] || user.role || '';
    const matchesRole = roleFilter === "all" || userRoleName.toLowerCase() === roleFilter.toLowerCase();
    return matchesSearch && matchesRole;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6 shadow-sm" style={{ 
        backgroundColor: theme.colors.accent || '#3b82f6',
        background: theme.isDarkMode 
          ? 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' 
          : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
      }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1 font-semibold" style={{ 
                color: '#ffffff', 
                borderColor: '#ffffff',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>User Management</span>
              <span className="font-medium" style={{ 
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>System Users</span>
              <span className="font-medium" style={{ 
                color: 'rgba(255,255,255,0.9)',
                textShadow: '0 1px 2px rgba(0,0,0,0.1)'
              }}>Access Control</span>
            </div>
            <h1 className="text-3xl font-bold text-white" style={{ 
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>User Management</h1>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 hover:scale-105 shadow-lg"
            style={{ 
              backgroundColor: theme.colors.success || '#10b981',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}
          >
            + Add User
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Controls */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              style={{
                backgroundColor: theme.bg.input,
                borderColor: theme.border.default,
                color: theme.text.primary,
                fontSize: '14px'
              }}
            />
          </div>
          <div className="sm:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              style={{
                backgroundColor: theme.bg.input,
                borderColor: theme.border.default,
                color: theme.text.primary,
                fontSize: '14px'
              }}
            >
              <option value="all">All Roles</option>
              {Object.entries(roles).map(([roleId, roleName]) => (
                <option key={roleId} value={roleName.toLowerCase()}>
                  {roleName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div 
          className="rounded-lg border overflow-hidden shadow-sm"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default,
            boxShadow: `0 4px 6px ${theme.shadow}`
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ 
              borderColor: theme.border.default,
              backgroundColor: theme.bg.card
            }}>
              <thead style={{ 
                backgroundColor: theme.bg.secondary,
                borderBottom: `2px solid ${theme.border.default}`
              }}>
                <tr>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Name</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Email</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Role</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Shift</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Status</th>
                  <th className="px-4 py-4 text-left text-sm font-bold uppercase tracking-wider" style={{ 
                    color: theme.text.primary,
                    fontWeight: '700',
                    fontSize: '12px',
                    letterSpacing: '0.05em'
                  }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ 
                borderColor: theme.border.default,
                backgroundColor: theme.bg.card
              }}>
                {loading ? (
                  <tr style={{ backgroundColor: theme.bg.card }}>
                    <td colSpan="6" className="text-center py-12" style={{ 
                      color: theme.text.secondary,
                      backgroundColor: theme.bg.card
                    }}>
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ 
                          borderColor: theme.colors.accent
                        }}></div>
                        <span className="ml-3 font-semibold text-lg">Loading users...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr style={{ backgroundColor: theme.bg.card }}>
                    <td colSpan="6" className="text-center py-12" style={{ 
                      color: theme.text.secondary,
                      backgroundColor: theme.bg.card
                    }}>
                      <div className="flex flex-col items-center">
                        <div className="text-6xl mb-4 opacity-60">👥</div>
                        <span className="font-bold text-xl mb-2" style={{ 
                          color: theme.text.primary
                        }}>No users found</span>
                        <span className="text-base opacity-80">Try adjusting your search or filters</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user, index) => (
                    <tr 
                      key={user.id || index} 
                      className="hover:opacity-95 transition-all duration-200" 
                      style={{ 
                        backgroundColor: theme.bg.card,
                        borderBottom: `1px solid ${theme.border.default}`
                      }}
                    >
                      <td className="px-4 py-4" style={{ 
                        color: theme.text.primary,
                        backgroundColor: theme.bg.card
                      }}>
                        <div className="font-bold text-base">
                          {user.fname} {user.mname && user.mname + ' '}{user.lname}
                        </div>
                        <div className="text-sm font-medium opacity-75" style={{ 
                          color: theme.text.secondary
                        }}>
                          @{user.username}
                        </div>
                      </td>
                      <td className="px-4 py-4" style={{ 
                        color: theme.text.primary,
                        backgroundColor: theme.bg.card
                      }}>
                        <div className="break-all font-semibold">{user.email}</div>
                        {user.contact && (
                          <div className="text-sm font-medium opacity-75" style={{ 
                            color: theme.isDarkMode ? '#cbd5e1' : '#64748b'
                          }}>
                            📞 {user.contact}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4" style={{ 
                        backgroundColor: theme.bg.card
                      }}>
                        <span 
                          className="inline-flex px-3 py-1 text-sm font-bold rounded-full border"
                          style={{ 
                            backgroundColor: theme.bg.secondary,
                            color: theme.text.primary,
                            borderColor: theme.border.default
                          }}
                        >
                          {roles[user.role] || user.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-4" style={{ 
                        color: theme.text.primary,
                        backgroundColor: theme.bg.card
                      }}>
                        <div className="text-sm font-semibold">
                          {shifts[user.shift] || user.shift || 'Not assigned'}
                        </div>
                        {user.age && (
                          <div className="text-xs font-medium opacity-75" style={{ 
                            color: theme.text.secondary
                          }}>
                            Age: {user.age}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4" style={{ 
                        backgroundColor: theme.bg.card
                      }}>
                        <span 
                          className="inline-flex px-3 py-1 text-sm font-bold rounded-full border"
                          style={{ 
                            backgroundColor: theme.isDarkMode ? '#065f46' : '#dcfce7',
                            color: theme.isDarkMode ? '#6ee7b7' : '#16a34a',
                            borderColor: theme.isDarkMode ? '#047857' : '#bbf7d0'
                          }}
                        >
                          ✓ Active
                        </span>
                      </td>
                      <td className="px-4 py-4" style={{ 
                        backgroundColor: theme.bg.card
                      }}>
                        <div className="flex space-x-2">
                          <button
                            className="px-3 py-1 text-sm font-semibold rounded border transition-all duration-200 hover:scale-105 hover:shadow-md"
                            style={{
                              color: theme.colors.accent,
                              borderColor: theme.colors.accent,
                              backgroundColor: theme.isDarkMode ? 'rgba(59, 130, 246, 0.2)' : 'rgba(37, 99, 235, 0.1)'
                            }}
                          >
                            Edit
                          </button>
                          <button
                            className="px-3 py-1 text-sm font-semibold rounded border transition-all duration-200 hover:scale-105 hover:shadow-md"
                            style={{
                              color: theme.colors.danger,
                              borderColor: theme.colors.danger,
                              backgroundColor: theme.isDarkMode ? 'rgba(239, 68, 68, 0.2)' : 'rgba(220, 38, 38, 0.1)'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add User Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div 
              className="rounded-lg shadow-xl p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto"
              style={{ 
                backgroundColor: theme.bg.modal || theme.bg.card,
                border: `1px solid ${theme.border.default}`,
                boxShadow: `0 25px 50px ${theme.shadow}`
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 
                  className="text-xl font-semibold"
                  style={{ color: theme.text.primary }}
                >
                  Add New User
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded hover:bg-gray-100"
                  style={{ 
                    color: theme.text.muted,
                    backgroundColor: 'transparent'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium" style={{ color: theme.text.primary }}>Personal Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>First Name *</label>
                      <input
                        type="text"
                        name="fname"
                        value={formData.fname}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Middle Name</label>
                      <input
                        type="text"
                        name="mname"
                        value={formData.mname}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Last Name *</label>
                      <input
                        type="text"
                        name="lname"
                        value={formData.lname}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Gender *</label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Birth Date *</label>
                      <input
                        type="date"
                        name="birthdate"
                        min="1800-01-01"
                        max="2010-01-01"
                        value={formData.birthdate}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium" style={{ color: theme.text.primary }}>Contact Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Contact Number *</label>
                      <input
                        type="tel"
                        name="contact"
                        value={formData.contact}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                        inputMode="numeric"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Address *</label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                </div>

                {/* Work Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium" style={{ color: theme.text.primary }}>Work Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Role *</label>
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      >
                        <option value="">Select Role</option>
                        {rolesList.map(role => (
                          <option key={role.role_id} value={role.role_id}>
                            {role.role}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Shift *</label>
                      <select
                        name="shift"
                        value={formData.shift}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      >
                        <option value="">Select Shift</option>
                        {shiftsList.map(shift => (
                          <option key={shift.shift_id} value={shift.shift_id}>
                            {shift.shift_name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Age *</label>
                      <input
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                        min={18}
                      />
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium" style={{ color: theme.text.primary }}>Account Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Username *</label>
                      <input
                        type="text"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        className="w-full border p-2 rounded"
                        style={{
                          backgroundColor: theme.bg.input || theme.bg.secondary,
                          borderColor: theme.border.default,
                          color: theme.text.primary
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          className="w-full border p-2 rounded pr-10"
                          style={{
                            backgroundColor: theme.bg.input,
                            borderColor: theme.border.input,
                            color: theme.text.primary
                          }}
                          required
                          placeholder="Must have Uppercase and Number"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          style={{ color: theme.text.muted }}
                        >
                          {showPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 border rounded transition-all duration-200"
                    style={{
                      backgroundColor: theme.bg.hover || theme.bg.secondary,
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    style={{ backgroundColor: theme.colors.success || '#10b981' }}
                  >
                    {loading ? 'Adding...' : 'Add User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UserManagement;
