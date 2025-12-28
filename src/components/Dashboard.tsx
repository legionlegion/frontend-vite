import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

interface Balance {
  companyName: string;
  carbonBalance: number;
  cashBalance: number;
}

interface Company {
  id: number;
  name: string;
}

interface Request {
  id: number;
  recipientId: number;
  type: string;
  price: number;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
  recipient: {
    name: string;
  };
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [balance, setBalance] = useState<Balance | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Form state for creating/editing requests
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [formData, setFormData] = useState({
    recipientId: "",
    type: "BUY",
    price: "",
    quantity: "",
    reason: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [balanceRes, requestsRes, companiesRes] = await Promise.all([
        api.get("/company/balance"),
        api.get("/requests/made"),
        api.get("/company/list")
      ]);
      
      setBalance(balanceRes.data);
      setRequests(requestsRes.data);
      setCompanies(companiesRes.data);
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/requests", {
        recipientId: parseInt(formData.recipientId),
        type: formData.type,
        price: parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        reason: formData.reason
      });
      
      setShowRequestForm(false);
      resetForm();
      fetchData();
    } catch (err: any) {
      console.log(err);
      setError(err.response?.data?.message || "Failed to create request");
    }
  };

  const handleUpdateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRequest) return;
    
    try {
      await api.put(`/requests/${editingRequest.id}`, {
        recipientId: parseInt(formData.recipientId),
        type: formData.type,
        price: parseFloat(formData.price),
        quantity: parseFloat(formData.quantity),
        reason: formData.reason
      });
      
      setEditingRequest(null);
      resetForm();
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update request");
    }
  };

  const handleDeleteRequest = async (id: number) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    
    try {
      await api.delete(`/requests/${id}`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to delete request");
    }
  };

  const handleEditClick = (request: Request) => {
    setEditingRequest(request);
    setFormData({
      recipientId: request.recipientId.toString(),
      type: request.type,
      price: request.price.toString(),
      quantity: request.quantity.toString(),
      reason: request.reason || ""
    });
    setShowRequestForm(true);
  };

  const resetForm = () => {
    setFormData({
      recipientId: "",
      type: "BUY",
      price: "",
      quantity: "",
      reason: ""
    });
    setEditingRequest(null);
    setShowRequestForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>Welcome, {user.name}</h1>
        <div>
          <button 
            onClick={() => window.location.href = '/requests-received'} 
            className="btn-secondary"
          >
            View Received Requests
          </button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Balance Display */}
      <section className="balance-section">
        <h2>{balance?.companyName} - Account Balance</h2>
        <div className="balance-cards">
          <div className="balance-card">
            <h3>Carbon Credits</h3>
            <p className="balance-amount">{balance?.carbonBalance.toFixed(2)} tonnes</p>
          </div>
          <div className="balance-card">
            <h3>Cash Balance</h3>
            <p className="balance-amount">SGD ${balance?.cashBalance.toFixed(2)}</p>
          </div>
        </div>
      </section>

      {/* Request Management */}
      <section className="requests-section">
        <div className="section-header">
          <h2>Outstanding Requests</h2>
          <button 
            onClick={() => {
              resetForm();
              setShowRequestForm(!showRequestForm);
            }}
            className="btn-primary"
          >
            {showRequestForm ? "Cancel" : "New Request"}
          </button>
        </div>

        {/* Request Form */}
        {showRequestForm && (
          <div className="request-form">
            <h3>{editingRequest ? "Edit Request" : "Create New Request"}</h3>
            <form onSubmit={editingRequest ? handleUpdateRequest : handleCreateRequest}>
              <div className="form-group">
                <label>Company</label>
                <select
                  value={formData.recipientId}
                  onChange={(e) => setFormData({ ...formData, recipientId: e.target.value })}
                  required
                >
                  <option value="">Select a company</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  required
                >
                  <option value="BUY">Buy</option>
                  <option value="SELL">Sell</option>
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Price (SGD/Tonne)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quantity (Tonnes)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="form-actions">
                <button type="submit" className="btn-primary">
                  {editingRequest ? "Update" : "Create"} Request
                </button>
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Requests Table */}
        <div className="requests-table">
          {requests.length === 0 ? (
            <p>No outstanding requests</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Company</th>
                  <th>Type</th>
                  <th>Price (SGD/Tonne)</th>
                  <th>Quantity (Tonnes)</th>
                  <th>Total (SGD)</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{new Date(request.created_at).toLocaleDateString()}</td>
                    <td>{request.recipient.name}</td>
                    <td>
                      <span className={`badge badge-${request.type.toLowerCase()}`}>
                        {request.type}
                      </span>
                    </td>
                    <td>${request.price.toFixed(2)}</td>
                    <td>{request.quantity.toFixed(2)}</td>
                    <td>${(request.price * request.quantity).toFixed(2)}</td>
                    <td>{request.reason || "-"}</td>
                    <td className="actions">
                      <button
                        onClick={() => handleEditClick(request)}
                        className="btn-edit"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteRequest(request.id)}
                        className="btn-delete"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;