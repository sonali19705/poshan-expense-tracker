
/**
 * Main JavaScript for PM Poshan Portal
 * Common utilities and functions used across multiple pages
 */

document.addEventListener('DOMContentLoaded', function () {
  loadDashboardData();
});

if (document.querySelector('.main-content h1')?.textContent.includes('Admin Dashboard')) {
  api.getAdminDashboardData().then(data => {
    if (!data) return;

    // Update Pending Bills
    document.querySelectorAll('.stat-value')[0].textContent = data.pending_bills;
    document.querySelector('.status-value.pending').textContent = data.pending_bills;

    // Update Grants
    document.querySelectorAll('.stat-value')[1].textContent = `₹${data.grants_allocated.toLocaleString()}`;
    document.querySelector('.stat-details').innerHTML = `
      <div>Utilized: ₹${data.grants_utilized.toLocaleString()}</div>
      <div>Remaining: ₹${data.grants_remaining.toLocaleString()}</div>
    `;

    // Update Organizations
    document.querySelectorAll('.stat-value')[2].textContent = data.organizations;

    // Update Bill Status Breakdown
    document.querySelector('.status-value.approved').textContent = data.approved_bills;
    document.querySelector('.status-value.rejected').textContent = data.rejected_bills;
  });
}


async function loadDashboardData() {
  try {
    const [bills, expenses, organization] = await Promise.all([
      api.getBills(),
      api.getExpenses(),
      api.getOrganizationDetails()
    ]);

    updateBillsSection(bills);
    updateStatCards(bills, expenses, organization);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
    showNotification('Failed to load dashboard data. Please try again.');
  }
}
function updateBillsSection(bills) {
  const recentBillsList = document.getElementById('recent-bills-list');
  
  if (!recentBillsList) return;

  recentBillsList.innerHTML = ''; // Clear old data

  if (bills.length === 0) {
    recentBillsList.innerHTML = '<li>No bills submitted yet.</li>';
    return;
  }

  bills.sort((a, b) => new Date(b.date) - new Date(a.date));
  const recentBills = bills.slice(0, 5);

  recentBills.forEach(bill => {
    const listItem = document.createElement('li');
    listItem.innerHTML = `
      ${bill.category} bill of ₹${bill.amount.toLocaleString()} 
      <span class="${getStatusClass(bill.status)}">${capitalizeFirstLetter(bill.status)}</span>
    `;
    recentBillsList.appendChild(listItem);
  });
}
function updateStatCards(bills, expenses, organization) {
  const statsContainer = document.getElementById('stats-container');
  if (!statsContainer) return;

  // Calculate stats
  const totalBills = bills.length;
  const approvedBills = bills.filter(bill => bill.status === 'approved').length;
  const pendingBills = bills.filter(bill => bill.status === 'pending').length;
  const rejectedBills = bills.filter(bill => bill.status === 'rejected').length;
  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount), 0);
  const availableFunds = organization ? parseFloat(organization.budget) - totalExpenses : 0;

  statsContainer.innerHTML = `
    <div class="stat-card">
      <h3>Bills Submitted</h3>
      <div class="stat-value">${totalBills}</div>
      <div class="stat-details">
        <div class="approved">Approved: ${approvedBills}</div>
        <div class="pending">Pending: ${pendingBills}</div>
        <div class="rejected">Rejected: ${rejectedBills}</div>
      </div>
    </div>

    <div class="stat-card">
      <h3>Total Expenses</h3>
      <div class="stat-value">₹${totalExpenses.toLocaleString()}</div>
      <p class="stat-description">This month's expenses</p>
    </div>

    <div class="stat-card">
      <h3>Available Funds</h3>
      <div class="stat-value">₹${availableFunds.toLocaleString()}</div>
      <p class="stat-description">Remaining allocated funds</p>
    </div>
  `;
}

// Set the current date for date inputs
document.addEventListener('DOMContentLoaded', function() {
    // Set the current date for date inputs if they exist
    const dateInputs = {
      'submission-date': null,
      'expense-date': null,
      'grant-date': null,
      'start-date': null,
      'end-date': null
    };
    
    const today = new Date().toISOString().split('T')[0];
    
    // Set date values
    Object.keys(dateInputs).forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.value = today;
      }
    });
    
    // Set end date for reports to next month
    const endDate = document.getElementById('end-date');
    if (endDate) {
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      endDate.value = nextMonth.toISOString().split('T')[0];
    }
  
    // Update copyright year
    const currentYearElement = document.getElementById('current-year');
    if (currentYearElement) {
      currentYearElement.textContent = new Date().getFullYear();
    }
  
    // Check auth on page load except for login and home pages
    checkAuth();
    
    // Add event listeners for common elements
    setupCommonEventListeners();
  });
  
  /**
   * Authentication check
   * Redirects to login if not authenticated
   */
  function checkAuth() {
    const publicPages = ['login.html', 'index.html', ''];
    const currentPage = window.location.pathname.split('/').pop();
    
    // Skip auth check for public pages
    if (publicPages.includes(currentPage)) {
      return;
    }
    
    const isLoggedIn = sessionStorage.getItem('isLoggedIn');
    const userRole = sessionStorage.getItem('userRole');
    
    if (!isLoggedIn) {
      window.location.href = '/login.html';
      return;
    }
    
    // Redirect if trying to access wrong dashboard
    const adminPages = ['admin-dashboard.html', 'bill-approval.html', 'grant-allocation.html', 
                        'report-generation.html', 'organization-management.html'];
    
    const userPages = ['user-dashboard.html', 'bill-submission.html', 'expense-entry.html'];
    
    const isAdminPage = adminPages.includes(currentPage);
    const isUserPage = userPages.includes(currentPage);
    
    if (userRole === 'admin' && isUserPage) {
      window.location.href = 'admin-dashboard.html';
    } else if (userRole === 'user' && isAdminPage) {
      window.location.href = 'user-dashboard.html';
    }
  }
  
  /**
   * Set up event listeners for common elements
   */
  function setupCommonEventListeners() {
    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      setupLoginForm();
    }
    
    // Navigation active state
    const navLinks = document.querySelectorAll('a[data-page]');
    highlightActiveNavLink(navLinks);
    
    // Logout Buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Bill Form
    const billForm = document.getElementById('bill-form');
    if (billForm) {
      setupBillForm();
    }
    
    // Expense Form
    const expenseForm = document.getElementById('expense-form');
    if (expenseForm) {
      setupExpenseForm();
    }
    
    // Grant Form
    const grantForm = document.getElementById('grant-form');
    if (grantForm) {
      setupGrantForm();
    }
    
    // Report Form
    const reportForm = document.getElementById('report-form');
    if (reportForm) {
      setupReportForm();
    }
    
    // Organization Form
    const organizationForm = document.getElementById('organization-form');
    if (organizationForm) {
      setupOrganizationForm();
    }
    
    // Close notification button
    const notificationClose = document.getElementById('notification-close');
    if (notificationClose) {
      notificationClose.addEventListener('click', function() {
        document.getElementById('toast-container').classList.add('hidden');
      });
    }
    
    // Bill approval/rejection buttons
    setupBillActionButtons();
  }
  
  /**
   * Generate navigation based on user role
   */
  function generateNavigation(userRole, currentPage) {
    const dynamicNav = document.getElementById('dynamic-nav');
    if (!dynamicNav) return;
    
    let navHTML = '<ul>';
    
    if (userRole === 'admin') {
      navHTML += `
        <li><a href="admin-dashboard.html" ${currentPage === 'admin-dashboard' ? 'class="active"' : ''} data-page="admin-dashboard">Dashboard</a></li>
        <li><a href="bill-approval.html" ${currentPage === 'bill-approval' ? 'class="active"' : ''} data-page="bill-approval">Approve Bills</a></li>
        <li><a href="grant-allocation.html" ${currentPage === 'grant-allocation' ? 'class="active"' : ''} data-page="grant-allocation">Allocate Grants</a></li>
        <li><a href="report-generation.html" ${currentPage === 'report-generation' ? 'class="active"' : ''} data-page="report-generation">Generate Reports</a></li>
        <li><a href="organization-management.html" ${currentPage === 'organization-management' ? 'class="active"' : ''} data-page="organization-management">Manage Organizations</a></li>
        <li><a href="notifications.html" ${currentPage === 'notifications' ? 'class="active"' : ''} data-page="notifications">Notifications</a></li>
      `;
    } else {
      navHTML += `
        <li><a href="user-dashboard.html" ${currentPage === 'user-dashboard' ? 'class="active"' : ''} data-page="user-dashboard">Dashboard</a></li>
        <li><a href="bill-submission.html" ${currentPage === 'bill-submission' ? 'class="active"' : ''} data-page="bill-submission">Submit Bills</a></li>
        <li><a href="expense-entry.html" ${currentPage === 'expense-entry' ? 'class="active"' : ''} data-page="expense-entry">Enter Expenses</a></li>
        <li><a href="notifications.html" ${currentPage === 'notifications' ? 'class="active"' : ''} data-page="notifications">Notifications</a></li>
      `;
    }
    
    navHTML += '</ul>';
    dynamicNav.innerHTML = navHTML;
  }
  
  /**
   * Highlight the active navigation link
   */
  function highlightActiveNavLink(navLinks) {
    if (!navLinks.length) return;
    
    const currentPage = window.location.pathname.split('/').pop();
    
    navLinks.forEach(link => {
      if (link.getAttribute('href') === currentPage) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }
  
  /**
   * Handle logout functionality
   */
  function handleLogout() {
    api.logout()
      .then(() => {
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userRole');
        window.location.href = '/login/';
      })
      .catch(error => {
        console.error('Logout error:', error);
        // Force logout anyway
        sessionStorage.removeItem('isLoggedIn');
        sessionStorage.removeItem('userRole');
        window.location.href = '/login/';
      });
  }
  
  /**
   * Set up login form
   */
  function setupLoginForm() {
    const loginForm = document.getElementById('login-form');
    const loginError = document.getElementById('login-error');

    if (!loginForm) {
        console.error("Login form not found.");
        return;
    }

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();

        const username = document.getElementById('username')?.value.trim();
        const password = document.getElementById('password')?.value.trim();
        const role = document.getElementById('role')?.value;

        if (!username || !password || !role) {
            loginError.textContent = "All fields are required.";
            return;
        }

        // 🔹 Replacing `login()` with an actual API call
        fetch('/login/', {  
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCSRFToken() // CSRF Token Handling
            },
            body: JSON.stringify({ username, password, role })
        })
        .then(response => response.json())  
        .then(data => {
            console.log("Server Response:", data); // Debugging

            if (data.success) {
                sessionStorage.setItem('isLoggedIn', 'true');
                sessionStorage.setItem('userRole', data.user.role);

                // Redirect to the correct dashboard
                window.location.href = data.user.role === 'admin' 
                    ? '/admin_dashboard/' 
                    : '/user_dashboard/';
            } else {
                loginError.textContent = data.message || "Invalid login credentials.";
            }
        })
        .catch(error => {
            console.error('Login error:', error);
            loginError.textContent = "An error occurred. Please try again.";
        });
    });
}

// 🔹 Function to Get CSRF Token (Necessary for Django)
function getCSRFToken() {
    let csrfToken = null;
    const cookies = document.cookie.split(';');
    cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            csrfToken = value;
        }
    });
    return csrfToken;
}


  
  /**
   * Set up bill submission form
   */
  function setupBillForm() {
    const billForm = document.getElementById('bill-form');
    const billCancel = document.getElementById('bill-cancel');
    const billDocument = document.getElementById('bill-document');
    const fileName = document.getElementById('file-name');
    
    // Handle file selection display
    if (billDocument) {
      billDocument.addEventListener('change', function() {
        if (this.files && this.files.length > 0) {
          fileName.textContent = this.files[0].name;
          fileName.classList.remove('hidden');
        } else {
          fileName.classList.add('hidden');
        }
      });
    }
    
    // Handle form submission
    billForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const amount = document.getElementById('bill-amount').value;
      const description = document.getElementById('bill-description').value;
      const date = document.getElementById('submission-date').value;
      
      if (!amount || !description) {
        showNotification('Please fill in all required fields.');
        return;
      }
      
      // Prepare form data for API
      const billData = {
        organizationName: 'ABC Organization', // In a real app, get from user profile
        amount: parseFloat(amount),
        description: description,
        date: date
      };
      
      // Submit bill through API
      api.submitBill(billData)
        .then(response => {
          if (response.success) {
            showNotification('Bill submitted successfully.');
            
            // Reset form
            billForm.reset();
            if (fileName) {
              fileName.classList.add('hidden');
            }
            
            // Redirect to dashboard
            setTimeout(() => {
              window.location.href = 'user-dashboard.html';
            }, 2000);
          } else {
            showNotification('Failed to submit bill. Please try again.');
          }
        })
        .catch(error => {
          console.error('Bill submission error:', error);
          showNotification('An error occurred. Please try again.');
        });
    });
    
    // Handle cancel button
    if (billCancel) {
      billCancel.addEventListener('click', function() {
        window.location.href = 'user-dashboard.html';
      });
    }
  }
  
  /**
   * Set up expense entry form
   */
  function setupExpenseForm() {
    const expenseForm = document.getElementById('expense-form');
    const expenseCancel = document.getElementById('expense-cancel');
    
    expenseForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const category = document.getElementById('expense-category').value;
      const amount = document.getElementById('expense-amount').value;
      const date = document.getElementById('expense-date').value;
      const description = document.getElementById('expense-description')?.value || '';
      
      if (!category || !amount || !date) {
        showNotification('Please fill in all required fields.');
        return;
      }
      
      // Prepare form data for API
      const expenseData = {
        organizationName: 'ABC Organization', // In a real app, get from user profile
        category: category,
        amount: parseFloat(amount),
        date: date,
        description: description
      };
      
      // Submit expense through API
      api.addExpense(expenseData)
        .then(response => {
          if (response.success) {
            showNotification('Expense recorded successfully.');
            
            // Reset form
            expenseForm.reset();
            const expenseDate = document.getElementById('expense-date');
            if (expenseDate) {
              expenseDate.value = new Date().toISOString().split('T')[0];
            }
            
            // Redirect to dashboard
            setTimeout(() => {
              window.location.href = 'user-dashboard.html';
            }, 2000);
          } else {
            showNotification('Failed to record expense. Please try again.');
          }
        })
        .catch(error => {
          console.error('Expense submission error:', error);
          showNotification('An error occurred. Please try again.');
        });
    });
    
    // Handle cancel button
    if (expenseCancel) {
      expenseCancel.addEventListener('click', function() {
        window.location.href = 'user-dashboard.html';
      });
    }
  }
  
  /**
   * Set up grant allocation form
   */
  function setupGrantForm() {
    const grantForm = document.getElementById('grant-form');
    const grantReset = document.getElementById('grant-reset');
    
    // Load organizations for dropdown
    const organizationSelect = document.getElementById('organization-select');
    if (organizationSelect) {
      api.getOrganizations()
        .then(organizations => {
          organizationSelect.innerHTML = '<option value="">Select Organization</option>';
          organizations.forEach(org => {
            organizationSelect.innerHTML += `<option value="${org.id}">${org.name} (Budget: ₹${org.budget.toLocaleString()})</option>`;
          });
        })
        .catch(error => {
          console.error('Error loading organizations:', error);
        });
    }
    
    // Handle form submission
    if (grantForm) {
      grantForm.addEventListener('submit', function(event) {
        event.preventDefault();
        
        const organizationId = document.getElementById('organization-select').value;
        const amount = document.getElementById('grant-amount').value;
        const date = document.getElementById('grant-date').value;
        
        if (!organizationId || !amount || !date) {
          showNotification('Please fill in all required fields.');
          return;
        }
        
        // Get organization name for the record
        const organizationSelect = document.getElementById('organization-select');
        const selectedOption = organizationSelect.options[organizationSelect.selectedIndex];
        const organizationName = selectedOption.text.split(' (')[0];
        
        // Prepare form data for API
        const grantData = {
          organizationId: organizationId,
          organizationName: organizationName,
          amount: parseFloat(amount),
          date: date
        };
        
        // Submit grant through API
        api.allocateGrant(grantData)
          .then(response => {
            if (response.success) {
              showNotification('Grant allocated successfully.');
              
              // Reset form
              grantForm.reset();
              const grantDate = document.getElementById('grant-date');
              if (grantDate) {
                grantDate.value = new Date().toISOString().split('T')[0];
              }
              
              // Refresh page to show updated table
              setTimeout(() => {
                window.location.reload();
              }, 2000);
            } else {
              showNotification('Failed to allocate grant. Please try again.');
            }
          })
          .catch(error => {
            console.error('Grant allocation error:', error);
            showNotification('An error occurred. Please try again.');
          });
      });
    }
    
    // Handle reset button
    if (grantReset) {
      grantReset.addEventListener('click', function() {
        grantForm.reset();
        const grantDate = document.getElementById('grant-date');
        if (grantDate) {
          grantDate.value = new Date().toISOString().split('T')[0];
        }
      });
    }
  }
  
  /**
   * Set up report generation form
   */
  function setupReportForm() {
    const reportForm = document.getElementById('report-form');
    
    reportForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const reportType = document.getElementById('report-type').value;
      const startDate = document.getElementById('start-date').value;
      const endDate = document.getElementById('end-date').value;
      
      // Prepare report parameters
      const reportParams = {
        type: reportType,
        startDate: startDate,
        endDate: endDate
      };
      
      // Generate report through API
      api.generateReport(reportParams)
        .then(response => {
          if (response.success) {
            showNotification('Report generated successfully. Downloading...');
            
            // Reset form after a delay
            setTimeout(() => {
              reportForm.reset();
              
              // Reset dates
              const startDateInput = document.getElementById('start-date');
              const endDateInput = document.getElementById('end-date');
              
              if (startDateInput) {
                startDateInput.value = new Date().toISOString().split('T')[0];
              }
              
              if (endDateInput) {
                const nextMonth = new Date();
                nextMonth.setMonth(nextMonth.getMonth() + 1);
                endDateInput.value = nextMonth.toISOString().split('T')[0];
              }
            }, 2000);
          } else {
            showNotification('Failed to generate report. Please try again.');
          }
        })
        .catch(error => {
          console.error('Report generation error:', error);
          showNotification('An error occurred. Please try again.');
        });
    });
  }
  
  /**
   * Set up organization management form
   */
  function setupOrganizationForm() {
    const organizationForm = document.getElementById('organization-form');
    
    organizationForm.addEventListener('submit', function(event) {
      event.preventDefault();
      
      const name = document.getElementById('organization-name').value;
      const budget = document.getElementById('organization-budget').value;
      
      if (!name || !budget) {
        showNotification('Please fill in all required fields.');
        return;
      }
      
      // Prepare organization data
      const orgData = {
        name: name,
        budget: parseFloat(budget)
      };
      
      // Add organization through API
      api.addOrganization(orgData)
        .then(response => {
          if (response.success) {
            showNotification('Organization added successfully.');
            
            // Reset form
            organizationForm.reset();
            
            // Refresh page to show updated table
            setTimeout(() => {
              window.location.reload();
            }, 2000);
          } else {
            showNotification('Failed to add organization. Please try again.');
          }
        })
        .catch(error => {
          console.error('Organization addition error:', error);
          showNotification('An error occurred. Please try again.');
        });
    });
  }
  
  /**
   * Set up bill approval/rejection buttons
   */
  function setupBillActionButtons() {
    const approveButtons = document.querySelectorAll('.btn-primary');
    const rejectButtons = document.querySelectorAll('.btn-secondary');
    
    // Handle bill approval
    approveButtons.forEach(button => {
      if (button.textContent === 'Approve') {
        button.addEventListener('click', function() {
          const row = this.closest('tr');
          const billId = parseInt(row.getAttribute('data-id') || row.id.split('-')[1]);
          
          api.approveBill(billId)
            .then(() => {
              showNotification('Bill approved successfully.');
              
              // Visual feedback
              row.style.backgroundColor = '#f0fff4';
              setTimeout(() => {
                row.remove();
              }, 1000);
            })
            .catch(error => {
              console.error('Bill approval error:', error);
              showNotification('Failed to approve bill. Please try again.');
            });
        });
      }
    });
    
    // Handle bill rejection
    rejectButtons.forEach(button => {
      if (button.textContent === 'Reject') {
        button.addEventListener('click', function() {
          const row = this.closest('tr');
          const billId = parseInt(row.getAttribute('data-id') || row.id.split('-')[1]);
          
          api.rejectBill(billId)
            .then(() => {
              showNotification('Bill rejected.');
              
              // Visual feedback
              row.style.backgroundColor = '#fff5f5';
              setTimeout(() => {
                row.remove();
              }, 1000);
            })
            .catch(error => {
              console.error('Bill rejection error:', error);
              showNotification('Failed to reject bill. Please try again.');
            });
        });
      }
    });
  }
  
  /**
   * Show notification toast
   */
  function showNotification(message) {
    const toastContainer = document.getElementById('toast-container');
    const notificationMessage = document.getElementById('notification-message');
    
    if (toastContainer && notificationMessage) {
      notificationMessage.textContent = message;
      toastContainer.classList.remove('hidden');
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        toastContainer.classList.add('hidden');
      }, 5000);
    }
    
  }
  