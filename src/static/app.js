document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const adminHint = document.getElementById("admin-hint");
  const userMenuToggle = document.getElementById("user-menu-toggle");
  const userMenuPanel = document.getElementById("user-menu-panel");
  const adminStatus = document.getElementById("admin-status");
  const loginButton = document.getElementById("login-button");
  const logoutButton = document.getElementById("logout-button");
  const loginModal = document.getElementById("login-modal");
  const loginForm = document.getElementById("login-form");
  const loginCancel = document.getElementById("login-cancel");
  const loginMessage = document.getElementById("login-message");

  const ADMIN_USER_KEY = "adminUser";
  const ADMIN_PASSWORD_KEY = "adminPassword";

  function getAdminCredentials() {
    const username = localStorage.getItem(ADMIN_USER_KEY);
    const password = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (!username || !password) {
      return null;
    }
    return { username, password };
  }

  function setAdminCredentials(username, password) {
    localStorage.setItem(ADMIN_USER_KEY, username);
    localStorage.setItem(ADMIN_PASSWORD_KEY, password);
  }

  function clearAdminCredentials() {
    localStorage.removeItem(ADMIN_USER_KEY);
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
  }

  function isAdmin() {
    return Boolean(getAdminCredentials());
  }

  function setAdminUiState() {
    const admin = getAdminCredentials();
    const loggedIn = Boolean(admin);
    adminStatus.textContent = loggedIn ? `Admin: ${admin.username}` : "Guest";
    loginButton.classList.toggle("hidden", loggedIn);
    logoutButton.classList.toggle("hidden", !loggedIn);
    signupForm.querySelectorAll("input, select, button").forEach((el) => {
      el.disabled = !loggedIn;
    });
    adminHint.classList.toggle("hidden", loggedIn);
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML =
        '<option value="">-- Select an activity --</option>';

      // Populate activities list
      const admin = isAdmin();
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map((email) => {
                    if (!admin) {
                      return `<li><span class="participant-email">${email}</span></li>`;
                    }
                    return `<li><span class="participant-email">${email}</span><button class="delete-btn" data-activity="${name}" data-email="${email}">Remove</button></li>`;
                  })
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");
    const admin = getAdminCredentials();
    if (!admin) {
      messageDiv.textContent = "Admin login required to remove students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-User": admin.username,
            "X-Admin-Password": admin.password,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to unregister. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error unregistering:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;
    const admin = getAdminCredentials();
    if (!admin) {
      messageDiv.textContent = "Admin login required to register students.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      return;
    }

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-User": admin.username,
            "X-Admin-Password": admin.password,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  userMenuToggle.addEventListener("click", () => {
    const expanded = userMenuToggle.getAttribute("aria-expanded") === "true";
    userMenuToggle.setAttribute("aria-expanded", String(!expanded));
    userMenuPanel.classList.toggle("hidden");
  });

  loginButton.addEventListener("click", () => {
    loginMessage.classList.add("hidden");
    loginForm.reset();
    loginModal.classList.remove("hidden");
  });

  loginCancel.addEventListener("click", () => {
    loginModal.classList.add("hidden");
  });

  logoutButton.addEventListener("click", () => {
    clearAdminCredentials();
    setAdminUiState();
    fetchActivities();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.getElementById("admin-username").value.trim();
    const password = document.getElementById("admin-password").value;

    try {
      const response = await fetch("/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.detail || "Login failed");
      }

      setAdminCredentials(username, password);
      setAdminUiState();
      loginModal.classList.add("hidden");
      fetchActivities();
    } catch (error) {
      loginMessage.textContent = error.message;
      loginMessage.className = "message error";
      loginMessage.classList.remove("hidden");
    }
  });

  setAdminUiState();
  fetchActivities();
});
