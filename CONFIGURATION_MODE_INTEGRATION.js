// =====================================================
// CONFIGURATION MODE INTEGRATION
// =====================================================
// Add this to your Configuration Mode form

// Step 1: Add "Generate Units" button to Configuration Mode
function addGenerateUnitsButton() {
    const configForm = document.getElementById('configuration-form'); // Adjust selector
    
    const generateButton = document.createElement('button');
    generateButton.type = 'button';
    generateButton.className = 'bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg';
    generateButton.innerHTML = '🔄 Generate Units from Configuration';
    generateButton.onclick = generateUnitsFromConfig;
    
    configForm.appendChild(generateButton);
}

// Step 2: Generate units based on configuration inputs
async function generateUnitsFromConfig() {
    try {
        // Get configuration values
        const config = {
            product_id: getCurrentProductId(), // Get from current context
            boxes: parseInt(document.getElementById('boxes').value) || 1,
            strips_per_box: parseInt(document.getElementById('strips_per_box').value) || 10,
            tablets_per_strip: parseInt(document.getElementById('tablets_per_strip').value) || 10,
            base_price: parseFloat(document.getElementById('base_price').value) || 7.00
        };
        
        // Validate inputs
        if (config.boxes < 1 || config.strips_per_box < 1 || config.tablets_per_strip < 1) {
            alert('Please enter valid values for all fields');
            return;
        }
        
        // Show loading
        const button = event.target;
        const originalText = button.innerHTML;
        button.innerHTML = '⏳ Generating Units...';
        button.disabled = true;
        
        // Call API to generate units
        const response = await fetch('/Api/dynamic_unit_system.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'generate_units_from_config',
                product_id: config.product_id,
                config: config
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            alert(`✅ Generated ${result.units.length} units successfully!\n\n` +
                  `Configuration:\n` +
                  `- Boxes: ${config.boxes}\n` +
                  `- Strips per Box: ${config.strips_per_box}\n` +
                  `- Tablets per Strip: ${config.tablets_per_strip}\n` +
                  `- Total Tablets: ${result.config.total_tablets}\n\n` +
                  `Generated Units:\n` +
                  result.units.map(u => `- ${u.unit_name}: ${u.unit_quantity} tablets = ₱${u.unit_price}`).join('\n'));
            
            // Refresh POS to show new units
            if (window.refreshPOS) {
                window.refreshPOS();
            }
            
        } else {
            alert('❌ Error: ' + result.message);
        }
        
    } catch (error) {
        console.error('Error generating units:', error);
        alert('❌ Error generating units: ' + error.message);
    } finally {
        // Reset button
        button.innerHTML = originalText;
        button.disabled = false;
    }
}

// Step 3: Auto-calculate total and show preview
function updateConfigurationPreview() {
    const boxes = parseInt(document.getElementById('boxes').value) || 0;
    const stripsPerBox = parseInt(document.getElementById('strips_per_box').value) || 0;
    const tabletsPerStrip = parseInt(document.getElementById('tablets_per_strip').value) || 0;
    const basePrice = parseFloat(document.getElementById('base_price').value) || 0;
    
    const totalTablets = boxes * stripsPerBox * tabletsPerStrip;
    const totalPrice = totalTablets * basePrice;
    
    // Update preview display
    const previewElement = document.getElementById('configuration-preview');
    if (previewElement) {
        previewElement.innerHTML = `
            <div class="bg-green-50 p-4 rounded-lg">
                <h3 class="font-bold text-green-800">Configuration Preview:</h3>
                <p><strong>Total Tablets:</strong> ${totalTablets}</p>
                <p><strong>Total Price:</strong> ₱${totalPrice.toFixed(2)}</p>
                <p><strong>Formula:</strong> ${boxes} boxes × ${stripsPerBox} strips × ${tabletsPerStrip} tablets</p>
                
                <h4 class="font-bold mt-2">Generated Units Preview:</h4>
                <ul class="text-sm">
                    <li>• tablet: 1 tablet = ₱${basePrice.toFixed(2)}</li>
                    <li>• strip (${tabletsPerStrip} tablets): ${tabletsPerStrip} tablets = ₱${(tabletsPerStrip * basePrice * 0.9).toFixed(2)}</li>
                    <li>• box (${stripsPerBox} strips): ${stripsPerBox * tabletsPerStrip} tablets = ₱${(stripsPerBox * tabletsPerStrip * basePrice * 0.85).toFixed(2)}</li>
                    ${boxes > 1 ? `<li>• large pack (${boxes} boxes): ${totalTablets} tablets = ₱${(totalTablets * basePrice * 0.75).toFixed(2)}</li>` : ''}
                </ul>
            </div>
        `;
    }
}

// Step 4: Add event listeners to configuration inputs
function setupConfigurationListeners() {
    const inputs = ['boxes', 'strips_per_box', 'tablets_per_strip', 'base_price'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', updateConfigurationPreview);
        }
    });
}

// Step 5: Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    addGenerateUnitsButton();
    setupConfigurationListeners();
    updateConfigurationPreview();
});

// =====================================================
// USAGE IN CONFIGURATION MODE:
// =====================================================

// 1. User fills configuration:
//    - Number of Boxes: 2
//    - Strips per Box: 9
//    - Tablets per Strip: 12
//    - Base Price: ₱7.00

// 2. Preview shows:
//    - Total Tablets: 216
//    - Generated Units Preview

// 3. User clicks "Generate Units from Configuration"

// 4. System generates units dynamically:
//    - tablet: 1 tablet = ₱7.00
//    - strip (12 tablets): 12 tablets = ₱75.60
//    - box (9 strips): 108 tablets = ₱642.60
//    - medium pack (1 boxes): 108 tablets = ₱604.80
//    - large pack (2 boxes): 216 tablets = ₱1134.00

// 5. POS shows new units in dropdown

// =====================================================
// NO MORE FIXED UNITS!
// =====================================================

