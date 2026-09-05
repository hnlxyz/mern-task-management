import { useEffect, useRef, useState } from "react";

import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  Eye,
  File,
  FileText,
  FolderOpen,
  Loader2,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  Upload,
  X,
  CalendarDays,
  Clock3,
  Paperclip,
  ListTodo,
  User,
} from "lucide-react";

import "./App.css";

import Auth from "./components/auth/Auth";
import ResetPassword from "./components/auth/ResetPassword";
import ChangePassword from "./components/auth/ChangePassword";
import AdminUsers from "./components/admin/AdminUsers";

function App() {
  const API_URL = import.meta.env.VITE_API_URL;

  // ROUTING
  const resetPasswordMatch = window.location.pathname.match(
    /^\/TaskManagement\/reset-password\/([^/]+)$/
);

  const resetToken = resetPasswordMatch?.[1];

  // AUTHENTICATION
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [user, setUser] = useState(null);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const sessionExpiredRef = useRef(false);

  const clearAuthentication = () => {
    setUser(null);
    setIsAuthenticated(false);
    setAuthChecking(false);
  };

  // API HELPER
  const apiFetch = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: "include",
    });

    if (
      response.status === 401 &&
      !url.includes("/auth/logout")
    ) {
      if (!sessionExpiredRef.current) {
        sessionExpiredRef.current = true;

        console.warn(
          "Authentication session expired or is no longer valid."
        );

        clearAuthentication();
      }
    }

    return response;
  };

  // CHECK AUTHENTICATION
  useEffect(() => {
    let isMounted = true;

    const checkAuthentication = async () => {
      try {
        setAuthChecking(true);

        const response = await fetch(`${API_URL}/auth/me`, {
          credentials: "include",
        });

        if (response.status === 401) {
          if (isMounted) {
            setUser(null);
            setIsAuthenticated(false);
            setAuthChecking(false);
          }

          return;
        }

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to check authentication."
          );
        }

        if (isMounted) {
          sessionExpiredRef.current = false;

          setUser(data.user);
          setIsAuthenticated(true);
          setAuthChecking(false);
        }
      } catch (error) {
        console.error("Authentication check failed:", error);

        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setAuthChecking(false);
        }
      }
    };

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  // LOGIN
  const handleLogin = (newUser) => {
    sessionExpiredRef.current = false;

    setUser(newUser);
    setIsAuthenticated(true);
    setAuthChecking(false);
  };

  // LOGOUT
  const handleLogout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      sessionExpiredRef.current = false;
      clearAuthentication();
    }
  };

  // PASSWORD CHANGED
  const handlePasswordChanged = () => {
    sessionExpiredRef.current = false;

    setShowChangePassword(false);
    clearAuthentication();
  };

  // TASK STATE
  const [tasks, setTasks] = useState([]);
  const [refreshTasks, setRefreshTasks] = useState(0);

  const formRef = useRef(null);

  // TASK FORM
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState("low");
  const [dueDate, setDueDate] = useState("");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  // TASK LIST
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // PAGINATION
  const [page, setPage] = useState(1);
  const limit = 10;
  const [totalPages, setTotalPages] = useState(1);

  // FILTERS
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [search, setSearch] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // SORTING
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");

  // TASK DETAILS
  const [selectedTask, setSelectedTask] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [viewError, setViewError] = useState("");

  // TASK FILES
  const [taskFiles, setTaskFiles] = useState({});

  // FILE UPLOAD
  const [selectedFiles, setSelectedFiles] = useState({});
  const [fileNames, setFileNames] = useState({});
  const [uploadingTaskId, setUploadingTaskId] = useState(null);
  const [fileError, setFileError] = useState("");

  // DELETE
  const [deletingTaskId, setDeletingTaskId] = useState(null);

  // STATISTICS
  const [stats, setStats] = useState(null);

  // SUCCESS MESSAGE
  const [successMessage, setSuccessMessage] = useState("");

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);

    setTimeout(() => {
      setSuccessMessage("");
    }, 3000);
  };

  // TASK HELPERS
  const isTaskCompleted = (taskId) => {
    const task = tasks.find((item) => item._id === taskId);

    if (task?.status === "completed") {
      return true;
    }

    return (
      selectedTask?._id === taskId &&
      selectedTask.status === "completed"
    );
  };

  // FETCH TASKS
  useEffect(() => {
    const fetchTasks = async () => {
      if (!isAuthenticated) {
        return;
      }

      if (startDate && endDate && startDate > endDate) {
        setError("Start date cannot be later than end date.");
        setTasks([]);
        setTotalPages(0);
        return;
      }

      const params = new URLSearchParams();

      params.append("page", page);
      params.append("limit", limit);

      if (filterStatus) {
        params.append("status", filterStatus);
      }

      if (filterPriority) {
        params.append("priority", filterPriority);
      }

      if (search.trim()) {
        params.append("search", search.trim());
      }

      if (startDate) {
        params.append("startDate", startDate);
      }

      if (endDate) {
        params.append("endDate", endDate);
      }

      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);

      try {
        setLoading(true);
        setError("");

        const response = await apiFetch(
          `${API_URL}/tasks?${params.toString()}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to fetch tasks."
          );
        }

        setTasks(data.tasks || []);
        setTotalPages(data.pagination?.totalPages || 1);
      } catch (error) {
        console.error("Error fetching tasks:", error);

        setError(
          error.message ||
          "Failed to load tasks. Please try again."
        );

        setTasks([]);
        setTotalPages(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [
    API_URL,
    isAuthenticated,
    page,
    filterStatus,
    filterPriority,
    search,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    refreshTasks,
  ]);

  // FETCH STATISTICS
  const fetchStats = async () => {
    if (!isAuthenticated) {
      return;
    }

    try {
      const response = await apiFetch(`${API_URL}/tasks/stats`);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch statistics."
        );
      }

      setStats(data);
    } catch (error) {
      console.error("Error fetching statistics:", error);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    fetchStats();
  }, [API_URL, isAuthenticated]);

  // RESET TASK FORM
  const resetTaskForm = () => {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setPriority("low");
    setDueDate("");
    setEditingTaskId(null);
    setFormError("");
  };

  // CREATE / UPDATE TASK
  const handleSubmit = async (e) => {
    e.preventDefault();

    setFormError("");

    if (!title.trim()) {
      setFormError("Task title is required.");
      return;
    }

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      dueDate: dueDate || null,
    };

    try {
      setSaving(true);

      const url = editingTaskId
        ? `${API_URL}/tasks/${editingTaskId}`
        : `${API_URL}/tasks`;

      const method = editingTaskId ? "PUT" : "POST";

      const response = await apiFetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save task."
        );
      }

      const savedTask = data.task || data;

      if (editingTaskId) {
        setTasks((previousTasks) =>
          previousTasks.map((task) =>
            task._id === editingTaskId
              ? savedTask
              : task
          )
        );

        if (selectedTask?._id === editingTaskId) {
          setSelectedTask(savedTask);
        }

        showSuccessMessage("Task updated successfully.");
      } else {
        setPage(1);

        setRefreshTasks((previous) => previous + 1);

        showSuccessMessage("Task created successfully.");
      }

      resetTaskForm();

      await fetchStats();
    } catch (error) {
      console.error("Error saving task:", error);

      setFormError(
        error.message ||
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  // EDIT TASK
  const handleEdit = (task) => {
    setEditingTaskId(task._id);
    setTitle(task.title || "");
    setDescription(task.description || "");
    setStatus(task.status || "todo");
    setPriority(task.priority || "low");

    setDueDate(
      task.dueDate
        ? new Date(task.dueDate)
          .toISOString()
          .split("T")[0]
        : ""
    );

    setFormError("");

    formRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  // DELETE TASK
  const handleDelete = async (id) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingTaskId(id);

      const response = await apiFetch(
        `${API_URL}/tasks/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete task."
        );
      }

      const remainingTasks = tasks.filter(
        (task) => task._id !== id
      );

      setTasks(remainingTasks);

      if (selectedTask?._id === id) {
        setSelectedTask(null);
      }

      setTaskFiles((previousFiles) => {
        const newFiles = { ...previousFiles };

        delete newFiles[id];

        return newFiles;
      });

      if (remainingTasks.length === 0 && page > 1) {
        setPage((previousPage) => previousPage - 1);
      } else {
        setRefreshTasks((previous) => previous + 1);
      }

      showSuccessMessage("Task deleted successfully.");

      await fetchStats();
    } catch (error) {
      console.error("Error deleting task:", error);

      setError(
        error.message ||
        "Unable to connect to the server. Please try again."
      );
    } finally {
      setDeletingTaskId(null);
    }
  };

  // MARK TASK COMPLETE
  const handleComplete = async (task) => {
    try {
      const response = await apiFetch(
        `${API_URL}/tasks/${task._id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            status: "completed",
            priority: task.priority,
            dueDate: task.dueDate || null,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to complete task."
        );
      }

      const updatedTask = data.task || data;

      setTasks((previousTasks) =>
        previousTasks.map((previousTask) =>
          previousTask._id === task._id
            ? updatedTask
            : previousTask
        )
      );

      setSelectedTask((previousTask) =>
        previousTask?._id === task._id
          ? updatedTask
          : previousTask
      );

      showSuccessMessage("Task marked as completed.");

      await fetchStats();
    } catch (error) {
      console.error("Error completing task:", error);

      setError(
        error.message ||
        "Unable to connect to the server. Please try again."
      );
    }
  };

  // FETCH TASK FILES
  const fetchTaskFiles = async (taskId) => {
    try {
      setFileError("");

      const response = await apiFetch(
        `${API_URL}/files/task/${taskId}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch task files."
        );
      }

      const files = Array.isArray(data)
        ? data
        : data.files || [];

      setTaskFiles((previousFiles) => ({
        ...previousFiles,
        [taskId]: files,
      }));

      return files;
    } catch (error) {
      console.error("Error fetching task files:", error);

      setFileError(
        error.message || "Failed to load files."
      );

      setTaskFiles((previousFiles) => ({
        ...previousFiles,
        [taskId]: [],
      }));

      return [];
    }
  };

  // VIEW TASK DETAILS
  const handleViewDetails = async (id) => {
    try {
      setViewLoading(true);
      setViewError("");
      setFileError("");

      const response = await apiFetch(
        `${API_URL}/tasks/${id}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to fetch task details."
        );
      }

      const task = data.task || data;

      if (!task || !task._id) {
        throw new Error(
          "Invalid task data received from server."
        );
      }

      setSelectedTask(task);

      await fetchTaskFiles(task._id);

      setTimeout(() => {
        document
          .getElementById("task-detail-section")
          ?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
      }, 100);
    } catch (error) {
      console.error("Error fetching task details:", error);

      setViewError(
        error.message || "Unable to load task details."
      );
    } finally {
      setViewLoading(false);
    }
  };

  // DELETE ATTACHED FILE
  const handleDeleteFile = async (fileId, taskId) => {
    if (isTaskCompleted(taskId)) {
      setFileError(
        "File deletion is disabled for completed tasks."
      );

      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this file?"
    );

    if (!confirmed) {
      return;
    }

    try {
      setFileError("");

      const response = await apiFetch(
        `${API_URL}/files/${fileId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to delete file."
        );
      }

      await fetchTaskFiles(taskId);

      showSuccessMessage("File deleted successfully.");
    } catch (error) {
      console.error("Error deleting file:", error);

      setFileError(
        error.message || "Unable to delete file."
      );
    }
  };

  // FILE SELECTION
  const handleFileChange = (e, taskId) => {
    if (isTaskCompleted(taskId)) {
      setFileError(
        "File upload is disabled for completed tasks."
      );

      e.target.value = "";

      return;
    }

    const files = Array.from(e.target.files);

    if (files.length === 0) {
      return;
    }

    setSelectedFiles((previousFiles) => ({
      ...previousFiles,
      [taskId]: files,
    }));

    setFileNames((previousNames) => ({
      ...previousNames,
      [taskId]: files.map((file) => file.name),
    }));

    setFileError("");

    e.target.value = "";
  };

  // CUSTOM FILE NAME
  const handleFileNameChange = (
    taskId,
    index,
    value
  ) => {
    const currentNames = [
      ...(fileNames[taskId] || []),
    ];

    currentNames[index] = value;

    const normalizedName = value.trim().toLowerCase();

    const existingFiles = taskFiles[taskId] || [];

    const duplicateExisting =
      normalizedName !== "" &&
      existingFiles.some((file) => {
        const existingName = (
          file.originalName || ""
        )
          .trim()
          .toLowerCase();

        return existingName === normalizedName;
      });

    const duplicateSelected =
      normalizedName !== "" &&
      currentNames.some(
        (name, nameIndex) =>
          nameIndex !== index &&
          name.trim().toLowerCase() === normalizedName
      );

    setFileNames((previousNames) => ({
      ...previousNames,
      [taskId]: currentNames,
    }));

    if (duplicateExisting || duplicateSelected) {
      const message = `A file named "${value.trim()}" already exists for this task.`;

      window.alert(message);
      setFileError(message);
    } else {
      setFileError("");
    }
  };

  // REMOVE SELECTED FILE
  const handleRemoveSelectedFile = (
    taskId,
    index
  ) => {
    if (isTaskCompleted(taskId)) {
      setFileError(
        "File upload is disabled for completed tasks."
      );

      return;
    }

    setSelectedFiles((previousFiles) => {
      const files = [
        ...(previousFiles[taskId] || []),
      ];

      files.splice(index, 1);

      return {
        ...previousFiles,
        [taskId]: files,
      };
    });

    setFileNames((previousNames) => {
      const names = [
        ...(previousNames[taskId] || []),
      ];

      names.splice(index, 1);

      return {
        ...previousNames,
        [taskId]: names,
      };
    });
  };

  // UPLOAD FILES
  const handleFileUpload = async (taskId) => {
    if (isTaskCompleted(taskId)) {
      setFileError(
        "File upload is disabled for completed tasks."
      );

      return;
    }

    const files = selectedFiles[taskId] || [];
    const names = fileNames[taskId] || [];

    if (files.length === 0) {
      setFileError("Please select at least one file.");
      return;
    }

    if (
      names.length !== files.length ||
      names.some((name) => !name.trim())
    ) {
      setFileError("File name cannot be empty.");
      return;
    }

    try {
      setUploadingTaskId(taskId);
      setFileError("");

      const formData = new FormData();

      formData.append("taskId", taskId);

      files.forEach((file) => {
        formData.append("files", file);
      });

      names.forEach((fileName) => {
        formData.append("fileNames", fileName.trim());
      });

      const response = await apiFetch(
        `${API_URL}/files/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to upload files."
        );
      }

      await fetchTaskFiles(taskId);

      setSelectedFiles((previousFiles) => {
        const newFiles = { ...previousFiles };

        delete newFiles[taskId];

        return newFiles;
      });

      setFileNames((previousNames) => {
        const newNames = { ...previousNames };

        delete newNames[taskId];

        return newNames;
      });

      showSuccessMessage("Files uploaded successfully.");
    } catch (error) {
      console.error("Error uploading files:", error);

      setFileError(
        error.message ||
        "Unable to upload files. Please try again."
      );
    } finally {
      setUploadingTaskId(null);
    }
  };

  // DUPLICATE FILE NAME CHECK
  const hasDuplicateFileName = (taskId) => {
    const existingFiles = taskFiles[taskId] || [];

    const existingNames = new Set(
      existingFiles
        .map((file) =>
          file.originalName?.trim().toLowerCase()
        )
        .filter(Boolean)
    );

    const names = fileNames[taskId] || [];
    const seenNames = new Set();

    return names.some((name) => {
      const normalizedName = name.trim().toLowerCase();

      if (!normalizedName) {
        return false;
      }

      if (existingNames.has(normalizedName)) {
        return true;
      }

      if (seenNames.has(normalizedName)) {
        return true;
      }

      seenNames.add(normalizedName);

      return false;
    });
  };

  // OVERDUE CHECK
  const isOverdue = (task) => {
    if (
      !task.dueDate ||
      task.status === "completed"
    ) {
      return false;
    }

    const today = new Date();

    const todayString =
      `${today.getFullYear()}-${String(
        today.getMonth() + 1
      ).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;

    const dueDateString = task.dueDate.split("T")[0];

    return dueDateString < todayString;
  };

  // FORMAT DATE
  const formatDate = (date) => {
    if (!date) {
      return "No date";
    }

    return new Date(date)
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(/ /g, "-");
  };

  // STATUS LABEL
  const getStatusLabel = (taskStatus) => {
    if (taskStatus === "in-progress") {
      return "In Progress";
    }

    if (taskStatus === "completed") {
      return "Completed";
    }

    return "Todo";
  };

  // PRIORITY LABEL
  const getPriorityLabel = (taskPriority) => {
    if (!taskPriority) {
      return "—";
    }

    return (
      taskPriority.charAt(0).toUpperCase() +
      taskPriority.slice(1)
    );
  };

  // FILE ICON
  const getFileIcon = (fileName) => {
    const extension = fileName
      ?.split(".")
      .pop()
      ?.toLowerCase();

    if (
      extension === "pdf" ||
      extension === "doc" ||
      extension === "docx" ||
      extension === "txt"
    ) {
      return <FileText size={18} />;
    }

    return <File size={18} />;
  };

  // CLEAR FILTERS
  const clearFilters = () => {
    setSearch("");
    setFilterStatus("");
    setFilterPriority("");
    setStartDate("");
    setEndDate("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
    setError("");
  };

  // EXPORT EXCEL
  const handleExportExcel = async () => {
    const params = new URLSearchParams();

    if (filterStatus) {
      params.append("status", filterStatus);
    }

    if (filterPriority) {
      params.append("priority", filterPriority);
    }

    if (search.trim()) {
      params.append("search", search.trim());
    }

    if (startDate) {
      params.append("startDate", startDate);
    }

    if (endDate) {
      params.append("endDate", endDate);
    }

    params.append("sortBy", sortBy);
    params.append("sortOrder", sortOrder);

    const exportUrl =
      `${API_URL}/tasks/export/excel?${params.toString()}`;

    try {
      const response = await apiFetch(exportUrl);

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.message || "Failed to export tasks"
        );
      }

      const blob = await response.blob();

      const downloadUrl =
        window.URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "tasks.xlsx";

      document.body.appendChild(link);

      link.click();
      link.remove();

      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error exporting tasks:", error);

      setError(
        error.message || "Failed to export tasks"
      );
    }
  };

  // RESET PASSWORD PAGE
  if (resetToken) {
    return (
      <ResetPassword
        API_URL={API_URL}
        token={resetToken}
        onBack={() => {
          window.history.pushState(
            {},
            "",
            "/TaskManagement/"
          );
          window.location.reload();
        }}
      />
    );
  }

  // AUTHENTICATION LOADING
  if (authChecking) {
    return (
      <div className="auth-loading">
        <Loader2
          size={24}
          className="icon-spin"
        />

        <p>Checking authentication...</p>
      </div>
    );
  }

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <Auth
        API_URL={API_URL}
        onLogin={handleLogin}
      />
    );
  }

  // MAIN APPLICATION
  return (
    <>
      <div className="app">
        <div className="app-container">

          {/* Page Header */}
          <div className="page-header">
            <div>
              <h1>Task Management</h1>

              <p>
                Manage, track and organize your tasks.
              </p>
            </div>

            <div className="user-section">
              <User size={18} />

              <span>{user?.name}</span>

              <button
                type="button"
                onClick={() =>
                  setShowChangePassword(true)
                }
                className="change-password-button"
              >
                Change Password
              </button>

              <button
                type="button"
                className="logout-button"
                onClick={handleLogout}
              >
                <LogOut size={15} />
                Logout
              </button>
            </div>
          </div>

          {user?.role === "admin" && (
            <AdminUsers API_URL={API_URL} />
          )}

          {/* Dashboard Statistics */}
          <div className="dashboard-grid">

            <div className="stat-card stat-total">
              <div className="stat-icon">
                <ClipboardList size={22} />
              </div>

              <div>
                <p className="stat-label">
                  Total Tasks
                </p>

                <h2>{stats?.total ?? 0}</h2>
              </div>
            </div>

            <div className="stat-card stat-todo">
              <div className="stat-icon">
                <ListTodo size={22} />
              </div>

              <div>
                <p className="stat-label">
                  Todo
                </p>

                <h2>{stats?.status?.todo ?? 0}</h2>
              </div>
            </div>

            <div className="stat-card stat-progress">
              <div className="stat-icon">
                <Clock3 size={22} />
              </div>

              <div>
                <p className="stat-label">
                  In Progress
                </p>

                <h2>
                  {stats?.status?.inProgress ?? 0}
                </h2>
              </div>
            </div>

            <div className="stat-card stat-completed">
              <div className="stat-icon">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <p className="stat-label">
                  Completed
                </p>

                <h2>
                  {stats?.status?.completed ?? 0}
                </h2>
              </div>
            </div>

            <div className="stat-card stat-overdue">
              <div className="stat-icon">
                <AlertTriangle size={22} />
              </div>

              <div>
                <p className="stat-label">
                  Overdue
                </p>

                <h2>{stats?.overdue ?? 0}</h2>
              </div>
            </div>

          </div>

          {/* Priority Statistics */}
          <div className="priority-section">
            <h2 className="section-title">
              Priority Overview
            </h2>

            <div className="priority-grid">

              <div className="priority-card priority-low">
                <div className="priority-icon">
                  <span className="priority-dot"></span>
                </div>

                <div>
                  <span>Low Priority</span>

                  <strong>
                    {stats?.priority?.low ?? 0}
                  </strong>
                </div>
              </div>

              <div className="priority-card priority-medium">
                <div className="priority-icon">
                  <span className="priority-dot"></span>
                </div>

                <div>
                  <span>Medium Priority</span>

                  <strong>
                    {stats?.priority?.medium ?? 0}
                  </strong>
                </div>
              </div>

              <div className="priority-card priority-high">
                <div className="priority-icon">
                  <span className="priority-dot"></span>
                </div>

                <div>
                  <span>High Priority</span>

                  <strong>
                    {stats?.priority?.high ?? 0}
                  </strong>
                </div>
              </div>

            </div>
          </div>

          {/* Search & Filters */}
          <div className="filter-section">

            <div className="filter-header">
              <div>
                <h2>Tasks</h2>

                <p>
                  Search, filter and organize your tasks.
                </p>
              </div>
            </div>

            <div className="filter-grid">

              {/* Search */}
              <div className="input-group search-group">
                <label>Search</label>

                <div className="input-with-icon">
                  <Search
                    className="input-icon"
                    size={16}
                  />

                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => {
                      setSearch(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Status */}
              <div className="input-group">
                <label>Status</label>

                <select
                  value={filterStatus}
                  onChange={(e) => {
                    setFilterStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">
                    All Statuses
                  </option>

                  <option value="todo">
                    Todo
                  </option>

                  <option value="in-progress">
                    In Progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>
                </select>
              </div>

              {/* Priority */}
              <div className="input-group">
                <label>Priority</label>

                <select
                  value={filterPriority}
                  onChange={(e) => {
                    setFilterPriority(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">
                    All Priorities
                  </option>

                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </div>

              {/* Start Date */}
              <div className="input-group">
                <label>Start Date</label>

                <div className="input-with-icon">
                  <CalendarDays
                    className="input-icon"
                    size={16}
                  />

                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* End Date */}
              <div className="input-group">
                <label>End Date</label>

                <div className="input-with-icon">
                  <CalendarDays
                    className="input-icon"
                    size={16}
                  />

                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPage(1);
                    }}
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="input-group">
                <label>Sort By</label>

                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [
                      newSortBy,
                      newSortOrder,
                    ] = e.target.value.split("-");

                    setSortBy(newSortBy);
                    setSortOrder(newSortOrder);
                    setPage(1);
                  }}
                >
                  <option value="createdAt-desc">
                    Newest First
                  </option>

                  <option value="createdAt-asc">
                    Oldest First
                  </option>

                  <option value="title-asc">
                    Title A-Z
                  </option>

                  <option value="title-desc">
                    Title Z-A
                  </option>

                  <option value="priority-desc">
                    Priority High-Low
                  </option>

                  <option value="priority-asc">
                    Priority Low-High
                  </option>
                </select>
              </div>

            </div>

            <div className="filter-actions">

              <button
                type="button"
                className="btn btn-secondary"
                onClick={clearFilters}
              >
                <RotateCcw size={15} />
                Clear Filters
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={handleExportExcel}
              >
                <Download size={15} />
                Export Excel
              </button>

            </div>
          </div>

          {/* Create / Edit Task Form */}
          <form
            ref={formRef}
            className="task-form-section"
            onSubmit={handleSubmit}
          >

            <div className="form-header">
              <div>
                <h2>
                  {editingTaskId
                    ? "Edit Task"
                    : "Create New Task"}
                </h2>

                <p>
                  {editingTaskId
                    ? "Update the task information below."
                    : "Add a new task to your task list."}
                </p>
              </div>

              {successMessage && (
                <div className="success-message">
                  <CheckCircle2 size={16} />
                  {successMessage}
                </div>
              )}
            </div>

            {formError && (
              <div className="error-message">
                <AlertCircle size={16} />
                {formError}
              </div>
            )}

            <div className="task-form-grid">

              {/* Title */}
              <div className="form-group form-full">
                <label>Task Title</label>

                <input
                  type="text"
                  placeholder="Enter task title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setFormError("");
                  }}
                />
              </div>

              {/* Description */}
              <div className="form-group form-full">
                <label>Description</label>

                <textarea
                  placeholder="Enter task description"
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  rows="5"
                />
              </div>

              {/* Status */}
              <div className="form-group">
                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                >
                  <option value="todo">
                    Todo
                  </option>

                  <option value="in-progress">
                    In Progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>
                </select>
              </div>

              {/* Priority */}
              <div className="form-group">
                <label>Priority</label>

                <select
                  value={priority}
                  onChange={(e) =>
                    setPriority(e.target.value)
                  }
                >
                  <option value="low">
                    Low
                  </option>

                  <option value="medium">
                    Medium
                  </option>

                  <option value="high">
                    High
                  </option>
                </select>
              </div>

              {/* Due Date */}
              <div className="form-group">
                <label>Due Date</label>

                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) =>
                    setDueDate(e.target.value)
                  }
                />
              </div>

            </div>

            <div className="form-actions">

              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={15}
                      className="icon-spin"
                    />
                    Saving...
                  </>
                ) : editingTaskId ? (
                  <>
                    <Pencil size={15} />
                    Update Task
                  </>
                ) : (
                  <>
                    <Plus size={15} />
                    Create Task
                  </>
                )}
              </button>

              {editingTaskId && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={resetTaskForm}
                >
                  <X size={15} />
                  Cancel
                </button>
              )}

            </div>
          </form>

        </div>

        {/* TASK DETAIL VIEW*/}
        <div
          id="task-detail-section"
          className="task-detail-wrapper"
        >

          {viewLoading && (
            <div className="task-detail-message">
              <Loader2
                size={20}
                className="icon-spin"
              />

              <p>
                Loading task details...
              </p>
            </div>
          )}

          {viewError && (
            <div className="error-message">
              <AlertCircle size={16} />
              {viewError}
            </div>
          )}

          {selectedTask && !viewLoading && (
            <div className="task-detail-card">

              {/* Detail Header */}
              <div className="detail-header">
                <div>
                  <h2>Task Details</h2>

                  <p>
                    View task information and attachments.
                  </p>
                </div>

                <button
                  type="button"
                  className="close-detail-button"
                  onClick={() =>
                    setSelectedTask(null)
                  }
                >
                  <X size={15} />
                  Close Detail
                </button>
              </div>

              {/* Task Information */}
              <div className="task-info-grid">

                <div className="task-info-item">
                  <strong>Task</strong>

                  <p>
                    {selectedTask.title || "—"}
                  </p>
                </div>

                <div className="task-info-item">
                  <strong>Status</strong>

                  <p>
                    {getStatusLabel(
                      selectedTask.status
                    )}
                  </p>
                </div>

                <div className="task-info-item">
                  <strong>Priority</strong>

                  <p>
                    {getPriorityLabel(
                      selectedTask.priority
                    )}
                  </p>
                </div>

                <div className="task-info-item">
                  <strong>Created Date</strong>

                  <p>
                    {formatDate(
                      selectedTask.createdAt
                    )}
                  </p>
                </div>

                <div className="task-info-item">
                  <strong>Due Date</strong>

                  <p>
                    {selectedTask.dueDate
                      ? formatDate(
                        selectedTask.dueDate
                      )
                      : "No due date"}
                  </p>
                </div>

                <div className="task-info-item">
                  <strong>Updated Date</strong>

                  <p>
                    {formatDate(
                      selectedTask.updatedAt
                    )}
                  </p>
                </div>

              </div>

              {/* Description */}
              <div className="detail-section">
                <strong>Description</strong>

                <div className="description-box">
                  {selectedTask.description ||
                    "No description"}
                </div>
              </div>

              {/* Attachments */}
              <div className="detail-section">

                <div className="attachment-header">
                  <div>
                    <strong>Attachments</strong>

                    <p>
                      Upload and manage files for this task.
                    </p>
                  </div>
                </div>

                <div className="attachment-box">

                  {fileError && (
                    <div className="file-error">
                      <AlertCircle size={15} />
                      {fileError}
                    </div>
                  )}

                  {/* Existing Files */}
                  <div className="existing-files">

                    <h4>Attached Files</h4>

                    {taskFiles[selectedTask._id] &&
                      taskFiles[selectedTask._id].length >
                      0 ? (
                      <div className="file-list">

                        {taskFiles[
                          selectedTask._id
                        ].map((file) => (
                          <div
                            className="file-item"
                            key={file._id}
                          >

                            <a
                              href={`${API_URL}/files/${file._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="file-link"
                            >
                              {getFileIcon(
                                file.fileName ||
                                file.originalName
                              )}

                              <span>
                                {file.originalName ||
                                  file.fileName ||
                                  "File"}
                              </span>
                            </a>

                            <button
                              type="button"
                              className="file-delete-button"
                              onClick={() =>
                                handleDeleteFile(
                                  file._id,
                                  selectedTask._id
                                )
                              }
                              disabled={
                                selectedTask.status ===
                                "completed"
                              }
                              title={
                                selectedTask.status ===
                                  "completed"
                                  ? "File deletion is disabled for completed tasks"
                                  : "Delete file"
                              }
                            >
                              <Trash2 size={14} />
                              Delete
                            </button>

                          </div>
                        ))}

                      </div>
                    ) : (
                      <p className="no-files">
                        No attachments
                      </p>
                    )}

                  </div>

                  {/* Upload Area */}
                  <div className="upload-area">

                    <h4>Upload Files</h4>

                    <label
                      className="file-select-button"
                      title={
                        selectedTask.status ===
                          "completed"
                          ? "File upload is disabled for completed tasks"
                          : "Select files"
                      }
                    >
                      <FolderOpen size={15} />

                      Select Files

                      <input
                        type="file"
                        multiple
                        disabled={
                          selectedTask.status ===
                          "completed"
                        }
                        onChange={(e) =>
                          handleFileChange(
                            e,
                            selectedTask._id
                          )
                        }
                      />
                    </label>

                    <p className="upload-help">
                      {selectedTask.status ===
                        "completed"
                        ? "File upload is disabled for completed tasks."
                        : "You can select one or multiple files."}
                    </p>

                    {/* Selected Files */}
                    {selectedFiles[
                      selectedTask._id
                    ] &&
                      selectedFiles[
                        selectedTask._id
                      ].length > 0 && (
                        <div className="selected-files">

                          <h4>Selected Files</h4>

                          {selectedFiles[
                            selectedTask._id
                          ].map((file, index) => (
                            <div
                              className="selected-file-item"
                              key={`${file.name}-${index}`}
                            >

                              <div className="selected-file-info">

                                <span className="selected-file-icon">
                                  {getFileIcon(file.name)}
                                </span>

                                <div>
                                  <div className="original-file-name">
                                    {file.name}
                                  </div>

                                  <div className="file-size">
                                    {(file.size / 1024).toFixed(
                                      1
                                    )}{" "}
                                    KB
                                  </div>
                                </div>

                              </div>

                              <div className="selected-file-controls">

                                <input
                                  type="text"
                                  value={
                                    fileNames[
                                    selectedTask._id
                                    ]?.[index] || ""
                                  }
                                  onChange={(e) =>
                                    handleFileNameChange(
                                      selectedTask._id,
                                      index,
                                      e.target.value
                                    )
                                  }
                                  placeholder="File name"
                                  disabled={
                                    selectedTask.status ===
                                    "completed"
                                  }
                                />

                                <button
                                  type="button"
                                  className="remove-file-button"
                                  onClick={() =>
                                    handleRemoveSelectedFile(
                                      selectedTask._id,
                                      index
                                    )
                                  }
                                  aria-label="Remove selected file"
                                  title={
                                    selectedTask.status ===
                                      "completed"
                                      ? "File upload is disabled for completed tasks"
                                      : "Remove file"
                                  }
                                  disabled={
                                    selectedTask.status ===
                                    "completed"
                                  }
                                >
                                  <X size={16} />
                                </button>

                              </div>

                            </div>
                          ))}

                          <button
                            type="button"
                            className="upload-button"
                            disabled={
                              uploadingTaskId ===
                              selectedTask._id ||
                              selectedTask.status ===
                              "completed" ||
                              hasDuplicateFileName(
                                selectedTask._id
                              )
                            }
                            onClick={() =>
                              handleFileUpload(
                                selectedTask._id
                              )
                            }
                            title={
                              selectedTask.status ===
                                "completed"
                                ? "File upload is disabled for completed tasks"
                                : hasDuplicateFileName(
                                  selectedTask._id
                                )
                                  ? "Please choose a different file name"
                                  : "Upload selected files"
                            }
                          >
                            {uploadingTaskId ===
                              selectedTask._id ? (
                              <>
                                <Loader2
                                  size={15}
                                  className="icon-spin"
                                />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload size={15} />
                                Upload Files
                              </>
                            )}
                          </button>

                        </div>
                      )}

                  </div>

                </div>
              </div>

            </div>
          )}

        </div>

        {/* TASK LIST */}
        <div className="task-list-wrapper">

          {loading ? (
            <div className="loading-message">
              <Loader2
                size={20}
                className="icon-spin"
              />

              Loading tasks...
            </div>
          ) : error ? (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-message">
              No tasks found.
            </div>
          ) : (
            <div className="table-container">

              <table className="task-table">

                <thead>
                  <tr>
                    <th>No</th>
                    <th>Task</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                    <th>Due Date</th>
                    <th>Updated</th>
                    <th>Files</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>

                  {tasks.map((task, index) => (
                    <tr key={task._id}>

                      <td>
                        {(page - 1) * limit +
                          index +
                          1}
                      </td>

                      <td className="task-title-cell">
                        {task.title}
                      </td>

                      <td className="description-cell">
                        <div
                          className="description-ellipsis"
                          title={
                            task.description || ""
                          }
                        >
                          {task.description ||
                            "No description"}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`status-badge status-${task.status}`}
                        >
                          {getStatusLabel(
                            task.status
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`priority-badge priority-${task.priority}`}
                        >
                          {getPriorityLabel(
                            task.priority
                          )}
                        </span>
                      </td>

                      <td className="date-cell">
                        {formatDate(
                          task.createdAt
                        )}
                      </td>

                      <td className="date-cell">
                        {task.dueDate
                          ? formatDate(
                            task.dueDate
                          )
                          : "—"}

                        {isOverdue(task) && (
                          <div className="overdue-label">
                            <AlertTriangle size={12} />
                            Overdue
                          </div>
                        )}
                      </td>

                      <td className="date-cell">
                        {formatDate(
                          task.updatedAt
                        )}
                      </td>

                      <td>
                        {taskFiles[task._id] &&
                          taskFiles[task._id].length >
                          0 ? (
                          <span
                            className="file-count"
                            title={`${taskFiles[task._id].length} attachment(s)`}
                          >
                            <Paperclip size={15} />

                            <span>
                              {
                                taskFiles[
                                  task._id
                                ].length
                              }
                            </span>
                          </span>
                        ) : (
                          <span className="no-file-count">
                            —
                          </span>
                        )}
                      </td>

                      <td>
                        <div className="action-buttons">

                          {/* View */}
                          <button
                            type="button"
                            className="action-button"
                            onClick={() =>
                              handleViewDetails(
                                task._id
                              )
                            }
                            disabled={viewLoading}
                            title="View task details"
                          >
                            {viewLoading ? (
                              <Loader2
                                size={14}
                                className="icon-spin"
                              />
                            ) : (
                              <Eye size={14} />
                            )}

                            {viewLoading
                              ? "Loading..."
                              : "View"}
                          </button>

                          {/* Complete */}
                          {task.status !==
                            "completed" && (
                              <button
                                type="button"
                                className="action-button complete-button"
                                onClick={() =>
                                  handleComplete(task)
                                }
                                title="Mark task as completed"
                              >
                                <Check size={14} />
                                Complete
                              </button>
                            )}

                          {/* Edit */}
                          <button
                            type="button"
                            className="action-button"
                            onClick={() =>
                              handleEdit(task)
                            }
                            title="Edit task"
                          >
                            <Pencil size={14} />
                            Edit
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            className="action-button delete-button"
                            onClick={() =>
                              handleDelete(task._id)
                            }
                            disabled={
                              deletingTaskId ===
                              task._id
                            }
                            title="Delete task"
                          >
                            {deletingTaskId ===
                              task._id ? (
                              <Loader2
                                size={14}
                                className="icon-spin"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}

                            {deletingTaskId ===
                              task._id
                              ? "Deleting..."
                              : "Delete"}
                          </button>

                        </div>
                      </td>

                    </tr>
                  ))}

                </tbody>

              </table>

            </div>
          )}

        </div>

        {/* PAGINATION */}
        <div className="pagination">

          <button
            type="button"
            className="pagination-button"
            onClick={() =>
              setPage((previousPage) =>
                Math.max(1, previousPage - 1)
              )
            }
            disabled={page === 1}
          >
            <ChevronLeft size={16} />
            Previous
          </button>

          <span className="pagination-info">
            Page {page} of {totalPages}
          </span>

          <button
            type="button"
            className="pagination-button"
            onClick={() =>
              setPage((previousPage) =>
                Math.min(
                  totalPages,
                  previousPage + 1
                )
              )
            }
            disabled={
              page >= totalPages ||
              totalPages === 0
            }
          >
            Next
            <ChevronRight size={16} />
          </button>

        </div>
      </div>

      {/* CHANGE PASSWORD MODAL */}

      {showChangePassword && (
        <ChangePassword
          API_URL={API_URL}
          onClose={() =>
            setShowChangePassword(false)
          }
          onPasswordChanged={
            handlePasswordChanged
          }
        />
      )}
    </>
  );
}

export default App;
