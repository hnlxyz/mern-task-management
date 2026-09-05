import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Loader2,
  ShieldCheck,
  Clock3,
  Search,
  ChevronLeft,
  ChevronRight,
  RotateCw,
} from "lucide-react";

const AdminUsers = ({ API_URL }) => {
  const [users, setUsers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [actionUserId, setActionUserId] =
    useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search and filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] =
    useState("all");
  const [statusFilter, setStatusFilter] =
    useState("all");

  // Pagination
  const [page, setPage] = useState(1);

  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalUsers: 0,
    totalPages: 1,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams();

      params.set("page", page);
      params.set("limit", 10);

      if (search.trim()) {
        params.set(
          "search",
          search.trim()
        );
      }

      if (roleFilter !== "all") {
        params.set(
          "role",
          roleFilter
        );
      }

      if (statusFilter !== "all") {
        params.set(
          "status",
          statusFilter
        );
      }

      const response = await fetch(
        `${API_URL}/admin/users?${params.toString()}`,
        {
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to fetch users."
        );
      }

      setUsers(data.users || []);

      setPagination(
        data.pagination || {
          page: 1,
          limit: 10,
          totalUsers: 0,
          totalPages: 1,
        }
      );
    } catch (error) {
      console.error(
        "Error fetching users:",
        error
      );

      setError(
        error.message ||
          "Failed to fetch users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [
    page,
    search,
    roleFilter,
    statusFilter,
  ]);

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1);
  };

  const handleRoleChange = (event) => {
    setRoleFilter(event.target.value);
    setPage(1);
  };

  const handleStatusChange = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("all");
    setStatusFilter("all");
    setPage(1);
  };

  const handleAction = async (
    userId,
    action
  ) => {
    try {
      setActionUserId(userId);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${API_URL}/admin/users/${userId}/${action}`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Failed to update user."
        );
      }

      setSuccess(
        data.message ||
          "User updated successfully."
      );

      await fetchUsers();
    } catch (error) {
      console.error(
        "Error updating user:",
        error
      );

      setError(
        error.message ||
          "Failed to update user."
      );
    } finally {
      setActionUserId(null);
    }
  };

  const totalUsers =
    pagination.totalUsers || 0;

  const pendingCount = users.filter(
    (user) =>
      user.status === "pending"
  ).length;

  const activeCount = users.filter(
    (user) =>
      user.status === "active"
  ).length;

  const suspendedCount =
    users.filter(
      (user) =>
        user.status === "suspended"
    ).length;

  const hasFilters =
    search.trim() !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all";

  return (
    <section className="admin-users-section">

      {/* Header */}
      <div className="admin-users-header">
        <div className="admin-users-title">
          <div className="admin-users-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h2>User Management</h2>

            <p>
              Manage user accounts and
              access permissions.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="admin-user-stats">

        <div className="admin-user-stat-card">
          <div className="admin-stat-icon">
            <Users size={19} />
          </div>

          <div>
            <span>Total Users</span>
            <strong>{totalUsers}</strong>
          </div>
        </div>

        <div className="admin-user-stat-card">
          <div className="admin-stat-icon pending">
            <Clock3 size={19} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{pendingCount}</strong>
          </div>
        </div>

        <div className="admin-user-stat-card">
          <div className="admin-stat-icon active">
            <CheckCircle2 size={19} />
          </div>

          <div>
            <span>Active</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="admin-user-stat-card">
          <div className="admin-stat-icon suspended">
            <Ban size={19} />
          </div>

          <div>
            <span>Suspended</span>
            <strong>{suspendedCount}</strong>
          </div>
        </div>

      </div>

      {/* Alerts */}
      {error && (
        <div className="admin-alert admin-alert-error">
          <XCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="admin-alert admin-alert-success">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* Users Card */}
      <div className="admin-users-card">

        {/* Card Header */}
        <div className="admin-users-card-header">
          <div>
            <h3>Registered Users</h3>

            <p>
              Review and manage account
              status.
            </p>
          </div>

          <span className="admin-user-count">
            {totalUsers} users
          </span>
        </div>

        {/* Search & Filters */}
        <div className="admin-users-filters">

          {/* Search */}
          <div className="admin-search-wrapper">
            <Search
              size={17}
              className="admin-search-icon"
            />

            <input
              type="text"
              value={search}
              onChange={handleSearchChange}
              placeholder="Search name or email..."
              className="admin-search-input"
            />
          </div>

          {/* Role */}
          <select
            value={roleFilter}
            onChange={handleRoleChange}
            className="admin-filter-select"
          >
            <option value="all">
              All Roles
            </option>

            <option value="user">
              User
            </option>

            <option value="admin">
              Admin
            </option>
          </select>

          {/* Status */}
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            className="admin-filter-select"
          >
            <option value="all">
              All Statuses
            </option>

            <option value="pending">
              Pending
            </option>

            <option value="active">
              Active
            </option>

            <option value="rejected">
              Rejected
            </option>

            <option value="suspended">
              Suspended
            </option>
          </select>

          {/* Clear */}
          {hasFilters && (
            <button
              type="button"
              className="admin-clear-button"
              onClick={clearFilters}
            >
              <RotateCw size={14} />
              Clear
            </button>
          )}

        </div>

        {/* Loading */}
        {loading ? (
          <div className="admin-loading">
            <Loader2
              size={20}
              className="icon-spin"
            />

            <span>
              Loading users...
            </span>
          </div>
        ) : (
          <>
            {/* User List */}
            <div className="admin-users-list">

              {users.length === 0 ? (
                <div className="admin-empty-state">
                  <Users size={32} />

                  <p>
                    No users found.
                  </p>

                  {hasFilters && (
                    <button
                      type="button"
                      className="admin-clear-button"
                      onClick={
                        clearFilters
                      }
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                users.map((account, index) => (
                  <div
                    className="admin-user-row"
                    key={account._id}
                  >

                    {/* Serial Number */}
                    <div className="admin-user-number">
                      {(page - 1) *
                        pagination.limit +
                        index +
                        1}
                    </div>

                    {/* User */}
                    <div className="admin-user-info">

                      <div className="admin-user-avatar">
                        {account.name
                          ?.charAt(0)
                          .toUpperCase()}
                      </div>

                      <div className="admin-user-details">
                        <strong>
                          {account.name}
                        </strong>

                        <span>
                          {account.email}
                        </span>
                      </div>

                    </div>

                    {/* Role */}
                    <div className="admin-user-role">

                      <span
                        className={`admin-role-badge ${account.role}`}
                      >
                        {account.role ===
                          "admin" && (
                          <ShieldCheck
                            size={13}
                          />
                        )}

                        {account.role}
                      </span>

                    </div>

                    {/* Status */}
                    <div className="admin-user-status">

                      <span
                        className={`admin-status-badge ${account.status}`}
                      >
                        <span className="admin-status-dot" />

                        {account.status}
                      </span>

                    </div>

                    {/* Date */}
                    <div className="admin-user-date">
                      {new Date(
                        account.createdAt
                      ).toLocaleDateString()}
                    </div>

                    {/* Actions */}
                    <div className="admin-user-actions">

                      {account.role ===
                      "admin" ? (
                        <span className="admin-protected-label">
                          <ShieldCheck
                            size={14}
                          />
                          Protected
                        </span>
                      ) : (
                        <>
                          {account.status ===
                            "pending" && (
                            <>
                              <button
                                type="button"
                                className="admin-action-button approve"
                                onClick={() =>
                                  handleAction(
                                    account._id,
                                    "approve"
                                  )
                                }
                                disabled={
                                  actionUserId ===
                                  account._id
                                }
                              >
                                {actionUserId ===
                                account._id ? (
                                  <Loader2
                                    size={14}
                                    className="icon-spin"
                                  />
                                ) : (
                                  <CheckCircle2
                                    size={14}
                                  />
                                )}

                                Approve
                              </button>

                              <button
                                type="button"
                                className="admin-action-button reject"
                                onClick={() =>
                                  handleAction(
                                    account._id,
                                    "reject"
                                  )
                                }
                                disabled={
                                  actionUserId ===
                                  account._id
                                }
                              >
                                <XCircle
                                  size={14}
                                />

                                Reject
                              </button>
                            </>
                          )}

                          {account.status ===
                            "rejected" && (
                            <button
                              type="button"
                              className="admin-action-button approve"
                              onClick={() =>
                                handleAction(
                                  account._id,
                                  "approve"
                                )
                              }
                              disabled={
                                actionUserId ===
                                account._id
                              }
                            >
                              <CheckCircle2
                                size={14}
                              />

                              Approve
                            </button>
                          )}

                          {account.status ===
                            "active" && (
                            <button
                              type="button"
                              className="admin-action-button suspend"
                              onClick={() =>
                                handleAction(
                                  account._id,
                                  "suspend"
                                )
                              }
                              disabled={
                                actionUserId ===
                                account._id
                              }
                            >
                              <Ban
                                size={14}
                              />

                              Suspend
                            </button>
                          )}

                          {account.status ===
                            "suspended" && (
                            <button
                              type="button"
                              className="admin-action-button reactivate"
                              onClick={() =>
                                handleAction(
                                  account._id,
                                  "reactivate"
                                )
                              }
                              disabled={
                                actionUserId ===
                                account._id
                              }
                            >
                              <RotateCcw
                                size={14}
                              />

                              Reactivate
                            </button>
                          )}
                        </>
                      )}

                    </div>

                  </div>
                ))
              )}

            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="admin-pagination">

                <button
                  type="button"
                  className="admin-page-button"
                  onClick={() =>
                    setPage(
                      (previousPage) =>
                        previousPage - 1
                    )
                  }
                  disabled={
                    page <= 1
                  }
                >
                  <ChevronLeft
                    size={16}
                  />

                  Previous
                </button>

                <div className="admin-page-numbers">
                  {Array.from(
                    {
                      length:
                        pagination.totalPages,
                    },
                    (_, index) =>
                      index + 1
                  ).map(
                    (pageNumber) => (
                      <button
                        key={pageNumber}
                        type="button"
                        className={`admin-page-number ${
                          pageNumber ===
                          page
                            ? "active"
                            : ""
                        }`}
                        onClick={() =>
                          setPage(
                            pageNumber
                          )
                        }
                      >
                        {pageNumber}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  className="admin-page-button"
                  onClick={() =>
                    setPage(
                      (previousPage) =>
                        previousPage + 1
                    )
                  }
                  disabled={
                    page >=
                    pagination.totalPages
                  }
                >
                  Next

                  <ChevronRight
                    size={16}
                  />
                </button>

              </div>
            )}

          </>
        )}

      </div>

    </section>
  );
};

export default AdminUsers;