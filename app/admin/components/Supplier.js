"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useTheme } from './ThemeContext';

import { getApiEndpointForAction, handleApiCall } from '../../lib/apiHandler';

function Supplier() {
  const { theme } = useTheme();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    supplier_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await handleApiCall("get_suppliers");
      if (response.success) {
        setSuppliers(response.data || []);
      } else {
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const response = await handleApiCall('add_supplier', newSupplier);
      
      if (response.success) {
        toast.success('Supplier added successfully!');
        setShowAddModal(false);
        setNewSupplier({
          supplier_name: '',
          contact_person: '',
          email: '',
          phone: '',
          address: '',
          status: 'Active'
        });
        fetchSuppliers();
      } else {
        toast.error(response.message || 'Failed to add supplier');
      }
    } catch (error) {
      console.error('Error adding supplier:', error);
      toast.error('Error adding supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleNewSupplierChange = (e) => {
    const { name, value } = e.target;
    setNewSupplier(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    supplier.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Supplier Management</span>
              <span style={{ color: theme.text.secondary }}>Vendor Relations</span>
              <span style={{ color: theme.text.secondary }}>Supply Chain</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Supplier Management</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: theme.colors.success }}
          >
            + Add Supplier
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Search Input */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            style={{
              backgroundColor: theme.bg.input,
              borderColor: theme.border.input,
              color: theme.text.primary
            }}
          />
        </div>

        {/* Suppliers Table */}
        <div 
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y" style={{ borderColor: theme.border.default }}>
              <thead style={{ backgroundColor: theme.bg.secondary }}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Supplier Name</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Contact Person</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Phone</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold uppercase whitespace-nowrap" style={{ color: theme.text.primary }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                {loading ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4" style={{ color: theme.text.muted }}>Loading...</td>
                  </tr>
                ) : filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-4" style={{ color: theme.text.muted }}>No suppliers found</td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier, index) => (
                    <tr key={supplier.id || index} className="hover:opacity-80 transition-opacity duration-200" style={{ backgroundColor: theme.bg.card }}>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ color: theme.text.primary }}>
                        {supplier.supplier_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ color: theme.text.primary }}>
                        {supplier.contact_person || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ color: theme.text.primary }}>
                        {supplier.email || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap" style={{ color: theme.text.primary }}>
                        {supplier.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className="px-2 py-1 text-xs font-semibold rounded-full"
                          style={{ 
                            backgroundColor: supplier.status === 'Active' ? theme.colors.successBg : theme.colors.warningBg,
                            color: supplier.status === 'Active' ? theme.colors.success : theme.colors.warning
                          }}
                        >
                          {supplier.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          className="px-3 py-1 rounded transition-all duration-200 border"
                          style={{
                            color: theme.colors.accent,
                            borderColor: theme.colors.accent,
                            backgroundColor: 'transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.backgroundColor = theme.colors.accent;
                            e.target.style.color = theme.bg.card;
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = theme.colors.accent;
                          }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Supplier Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div 
              className="rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
              style={{ 
                backgroundColor: theme.bg.modal,
                border: `1px solid ${theme.border.default}`,
                boxShadow: `0 25px 50px ${theme.shadow.lg}`
              }}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 
                  className="text-xl font-semibold"
                  style={{ color: theme.text.primary }}
                >
                  Add New Supplier
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 rounded transition-all duration-200"
                  style={{ 
                    color: theme.text.muted,
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.backgroundColor = theme.bg.hover;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'transparent';
                  }}
                >
                  ✕
                </button>
              </div>
              
              <form onSubmit={handleAddSupplier} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Supplier Name *</label>
                    <input
                      type="text"
                      name="supplier_name"
                      value={newSupplier.supplier_name}
                      onChange={handleNewSupplierChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Contact Person *</label>
                    <input
                      type="text"
                      name="contact_person"
                      value={newSupplier.contact_person}
                      onChange={handleNewSupplierChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Email *</label>
                    <input
                      type="email"
                      name="email"
                      value={newSupplier.email}
                      onChange={handleNewSupplierChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Phone *</label>
                    <input
                      type="tel"
                      name="phone"
                      value={newSupplier.phone}
                      onChange={handleNewSupplierChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Address *</label>
                    <textarea
                      name="address"
                      value={newSupplier.address}
                      onChange={handleNewSupplierChange}
                      rows="3"
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Status</label>
                    <select
                      name="status"
                      value={newSupplier.status}
                      onChange={handleNewSupplierChange}
                      className="w-full border p-2 rounded"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded transition-all duration-200"
                    style={{
                      backgroundColor: 'transparent',
                      borderColor: theme.border.default,
                      color: theme.text.primary
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = theme.bg.hover;
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = 'transparent';
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 rounded text-white transition-all duration-200 hover:scale-105 disabled:opacity-50"
                    style={{ backgroundColor: theme.colors.success }}
                  >
                    {loading ? 'Adding...' : 'Add Supplier'}
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

export default Supplier;
