import { useEffect, useState } from "react";
import api from "../api/axios";
import { useAuth } from "../context/AuthContext";
import "./Dashboard.css";

interface ReceivedRequest {
  id: number;
  requestorId: number;
  type: string;
  price: number;
  quantity: number;
  reason: string;
  status: string;
  created_at: string;
  requestor: {
    name: string;
  };
}

const RequestsReceived = () => {
  const { user, logout } = useAuth();
  const [requests, setRequests] = useState<ReceivedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [showOverdueAlert, setShowOverdueAlert] = useState(false);
  const [overdueRequests, setOverdueRequests] = useState<ReceivedRequest[]>([]);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/requests/received");
      setRequests(res.data);
      
      // Check for overdue requests (older than 7 days)
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const overdue = res.data.filter((req: ReceivedRequest) => 
        new Date(req.created_at) < sevenDaysAgo
      );
      
      if (overdue.length > 0) {
        setOverdueRequests(overdue);
        setShowOverdueAlert(true);
      }
      
      setError("");
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch requests");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (id: number, action: "ACCEPT" | "REJECT") => {
    try {
      await api.post(`/requests/${id}/process`, { action });
      fetchRequests();
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || `Failed to ${action.toLowerCase()} request`);
    }
  };

  const handleBulkProcess = async (action: "ACCEPT" | "REJECT") => {
    if (selectedIds.length === 0) {
      alert("Please select at least one request");
      return;
    }

    if (!confirm(`Are you sure you want to ${action.toLowerCase()} ${selectedIds.length} request(s)?`)) {
      return;
    }

    try {
      const res = await api.post("/requests/bulk-process", {
        requestIds: selectedIds,
        action
      });
      
      alert(
        `Successfully processed: ${res.data.results.successful.length}\n` +
        `Failed: ${res.data.results.failed.length}`
      );
      
      fetchRequests();
      setSelectedIds([]);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to process requests");
    }
  };

  const handleCheckboxChange = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === requests.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(requests.map(r => r.id));
    }
  };

  const isOverdue = (dateString: string) => {
    const requestDate = new Date(dateString);
    const now = new Date();
    const daysDiff = (now.getTime() - requestDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff > 7;
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="requests-received">
      <header className="dashboard-header">
        <h1>Requests Received</h1>
        <div>
          <button onClick={() => window.location.href = '/dashboard'} className="btn-secondary">
            Back to Dashboard
          </button>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>

      {error && <div className="error-message">{error}</div>}

      {/* Overdue Alert Modal */}
      {showOverdueAlert && (
        <div className="modal-overlay" onClick={() => setShowOverdueAlert(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>⚠️ Overdue Requests</h2>
            <p>You have {overdueRequests.length} request(s) that are older than 7 days:</p>
            <ul>
              {overdueRequests.map(req => (
                <li key={req.id}>
                  {req.requestor.name} - {req.type} {req.quantity} tonnes at ${req.price}/tonne
                  <br />
                  <small>Created: {new Date(req.created_at).toLocaleDateString()}</small>
                </li>
              ))}
            </ul>
            <button onClick={() => setShowOverdueAlert(false)} className="btn-primary">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {requests.length > 0 && (
        <div className="bulk-actions">
          <label>
            <input
              type="checkbox"
              checked={selectedIds.length === requests.length}
              onChange={handleSelectAll}
            />
            Select All ({selectedIds.length} selected)
          </label>
          <div className="bulk-buttons">
            <button
              onClick={() => handleBulkProcess("ACCEPT")}
              disabled={selectedIds.length === 0}
              className="btn-accept"
            >
              Accept Selected
            </button>
            <button
              onClick={() => handleBulkProcess("REJECT")}
              disabled={selectedIds.length === 0}
              className="btn-reject"
            >
              Reject Selected
            </button>
          </div>
        </div>
      )}

      {/* Requests Table */}
      <section className="requests-section">
        <h2>Incoming Requests</h2>
        {requests.length === 0 ? (
          <p>No pending requests</p>
        ) : (
          <div className="requests-table">
            <table>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === requests.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Date</th>
                  <th>Requestor</th>
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
                  <tr 
                    key={request.id}
                    className={isOverdue(request.created_at) ? "overdue-row" : ""}
                  >
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(request.id)}
                        onChange={() => handleCheckboxChange(request.id)}
                      />
                    </td>
                    <td>
                      {new Date(request.created_at).toLocaleDateString()}
                      {isOverdue(request.created_at) && (
                        <span className="overdue-badge" title="Older than 7 days">⚠️</span>
                      )}
                    </td>
                    <td>{request.requestor.name}</td>
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
                        onClick={() => handleProcessRequest(request.id, "ACCEPT")}
                        className="btn-accept"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleProcessRequest(request.id, "REJECT")}
                        className="btn-reject"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default RequestsReceived;
