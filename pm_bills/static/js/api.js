// 🔹 Utility to get CSRF token from cookies (required for POST requests in Django)
function getCSRFToken() {
  let cookieValue = null;
  const cookies = document.cookie.split(';');
  for (let i = 0; i < cookies.length; i++) {
    let cookie = cookies[i].trim();
    if (cookie.startsWith('csrftoken=')) {
      cookieValue = cookie.substring('csrftoken='.length, cookie.length);
      break;
    }
  }
  return cookieValue;
}

// 🔹 Simulated delay function (for demo/loading experience)
function simulateDelay(ms = 300) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 🔹 Normalize bill keys for consistency
function normalizeBill(bill) {
  return {
    ...bill,
    amount: bill.bill_amount || bill.amount || 0,
    description: bill.bill_description || bill.description || '',
    organizationName: bill.organization_name || bill.organizationName || '',
    status: bill.status || 'pending',
    date: bill.date || new Date().toISOString()
  };
}

// 🔹 Main API object
const api = {
  // ======================
  // Expenses, Bills, Org
  // ======================
  getBills: async function () {
    try {
      const response = await fetch('/api/bills/');
      if (!response.ok) throw new Error("Failed to fetch bills");
      const bills = await response.json();
      return bills.map(normalizeBill);
    } catch (error) {
      console.error('Error fetching bills:', error);
      return [];
    }
  },

  submitBill: async function (billData) {
    try {
      const formData = new FormData();
      formData.append('organization_id', billData.organization_id);
      formData.append('bill_amount', billData.bill_amount);
      formData.append('bill_description', billData.bill_description);
      formData.append('bill_document', billData.bill_document); // file object

      const response = await fetch('/submit-bill/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken() // DO NOT set Content-Type manually
        },
        body: formData
      });

      const data = await response.json();
      console.log("Response Data:", data);
      return data;

    } catch (error) {
      console.error("Bill submission error:", error);
      return { success: false, error: error.message };
    }
  },

  getExpenses: async function () {
    try {
      const response = await fetch('/api/expenses/');
      if (!response.ok) throw new Error("Failed to fetch expenses");
      return await response.json();
    } catch (error) {
      console.error('Error fetching expenses:', error);
      return [];
    }
  },

  getOrganizationDetails: async function () {
    try {
      const response = await fetch('/api/organization/');
      if (!response.ok) throw new Error("Failed to fetch organization details");
      return await response.json();
    } catch (error) {
      console.error('Error fetching organization details:', error);
      return null;
    }
  },

  // ======================
  // Notifications
  // ======================
  getNotifications: async function () {
    try {
      const response = await fetch('/api/notifications/');
      if (!response.ok) {
        const errorText = await response.text();  // capture raw response for debugging
        console.error("Non-200 response:", errorText);
        throw new Error("Failed to fetch notifications");
      }
  
      const data = await response.json();
  
      // If your backend sends something like { notifications: [...] }
      if (Array.isArray(data.notifications)) {
        return data.notifications;
      }
  
      // If the response is already an array
      if (Array.isArray(data)) {
        return data;
      }
  
      console.warn("Unexpected notifications format:", data);
      return [];  // fallback to empty array
  
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];  // fallback to empty array
    }
  },
  

  markNotificationAsRead: async function (id) {
    try {
      const response = await fetch(`/api/notifications/${id}/read/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken()
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return { success: false };
    }
  },

  deleteNotification: async function (id) {
    try {
      const response = await fetch(`/api/notifications/${id}/delete/`, {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken()
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Error deleting notification:', error);
      return { success: false };
    }
  },
  getAdminDashboardData: async function () {
    try {
      const response = await fetch('/api/admin-dashboard-data/');
      if (!response.ok) throw new Error('Failed to fetch admin dashboard data');
      return await response.json();
    } catch (error) {
      console.error('Dashboard fetch error:', error);
      return null;
    }
  },
  // ======================
  // Auth
  // ======================
  login: async function (credentials) {
    try {
      const response = await fetch('/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify(credentials)
      });
      return await response.json();
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  },

  logout: async function () {
    try {
      const response = await fetch('/logout/', {
        method: 'POST',
        headers: {
          'X-CSRFToken': getCSRFToken()
        }
      });
      return await response.json();
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, message: 'Logout failed' };
    }
  },

  // ======================
  // Reports
  // ======================
  generateReport: async function (reportParams) {
    return simulateDelay(1000).then(() => ({
      success: true,
      reportUrl: "#",
      message: "Report generated successfully"
    }));
  }
};

// Export `api` for use in other scripts
// ✅ You MUST load this file *before* script.js in your HTML file.
window.api = api;
