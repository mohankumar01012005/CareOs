import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useCareCircle } from '../../hooks/useCareCircle';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { careTaskApi } from '../../api/careTask.api';
import { careCircleApi } from '../../api/careCircle.api';
import { TaskCard } from './components/TaskCard';
import { TaskFormModal } from './components/TaskFormModal';
import { TaskDetailModal } from './components/TaskDetailModal';
import { CalendarScheduleView } from './components/CalendarScheduleView';
import { WorkloadView } from './components/WorkloadView';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { EmptyState } from '../../components/ui/EmptyState';
import { Icon } from '../../components/ui/Icon';
import {
  TASK_CATEGORIES,
  TASK_CATEGORY_LABELS,
  ALL_TASK_PRIORITIES,
  TASK_PRIORITY_LABELS,
  TASK_TIME_SLOTS,
  TASK_TIME_SLOT_LABELS,
  TASK_STATUS,
} from '../../constants/roles';

export function TasksPage() {
  const { activeCircleId, activeCircle, activeRecipient, permissions } = useCareCircle();
  const { user } = useAuth();
  const toast = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const [activeTab, setActiveTab] = useState('today'); // 'today' | 'upcoming' | 'calendar' | 'completed' | 'workload'
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [timeSlotFilter, setTimeSlotFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');

  // Calendar selected date
  const [selectedCalendarDate, setSelectedCalendarDate] = useState(todayStr);

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);
  const [formInitialDate, setFormInitialDate] = useState(null);

  /**
   * Load active care circle members for assignee selection
   */
  const loadCircleMembers = useCallback(async () => {
    if (!activeCircleId) return;
    try {
      const details = await careCircleApi.getCareCircleDetails(activeCircleId);
      if (details?.members) {
        setMembers(details.members);
      }
    } catch (err) {
      console.warn('Failed to load circle members for tasks:', err.message);
    }
  }, [activeCircleId]);

  /**
   * Load tasks from backend
   */
  const loadTasks = useCallback(async () => {
    if (!activeCircleId) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = {};

      if (activeTab === 'today') {
        params.tab = 'today';
      } else if (activeTab === 'upcoming') {
        params.tab = 'upcoming';
      } else if (activeTab === 'completed') {
        params.tab = 'completed';
      }

      if (searchQuery.trim()) {
        params.search = searchQuery.trim();
      }
      if (categoryFilter) {
        params.category = categoryFilter;
      }
      if (priorityFilter) {
        params.priority = priorityFilter;
      }
      if (timeSlotFilter) {
        params.timeSlot = timeSlotFilter;
      }
      if (assigneeFilter) {
        params.assignedTo = assigneeFilter;
      }

      const data = await careTaskApi.getCircleTasks(activeCircleId, params);
      setTasks(data?.tasks || []);
    } catch (err) {
      console.error('Failed to load care tasks:', err);
      setError(err.message || 'Unable to load care tasks.');
    } finally {
      setIsLoading(false);
    }
  }, [
    activeCircleId,
    activeTab,
    searchQuery,
    categoryFilter,
    priorityFilter,
    timeSlotFilter,
    assigneeFilter,
  ]);

  useEffect(() => {
    loadCircleMembers();
  }, [loadCircleMembers]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  /**
   * Create or update task handler
   */
  const handleFormSubmit = async (taskPayload) => {
    if (!activeCircleId) return;

    if (editingTask) {
      const taskId = editingTask.id || editingTask._id;
      const res = await careTaskApi.updateTask(activeCircleId, taskId, taskPayload);
      toast.success('Task updated successfully.');
      if (selectedTaskDetail && (selectedTaskDetail.id || selectedTaskDetail._id) === taskId) {
        setSelectedTaskDetail(res.task);
      }
    } else {
      await careTaskApi.createTask(activeCircleId, taskPayload);
      toast.success('Care task scheduled successfully.');
    }

    setEditingTask(null);
    setFormInitialDate(null);
    await loadTasks();
  };

  /**
   * Toggle task completion status
   */
  const handleToggleComplete = async (task) => {
    if (!activeCircleId) return;
    const taskId = task.id || task._id;
    const newStatus =
      task.status === TASK_STATUS.COMPLETED
        ? TASK_STATUS.PENDING
        : TASK_STATUS.COMPLETED;

    try {
      const res = await careTaskApi.updateTaskStatus(activeCircleId, taskId, {
        status: newStatus,
      });

      if (newStatus === TASK_STATUS.COMPLETED) {
        toast.success(`Completed "${task.title}"!`);
      } else {
        toast.info(`Reverted "${task.title}" to pending.`);
      }

      if (selectedTaskDetail && (selectedTaskDetail.id || selectedTaskDetail._id) === taskId) {
        setSelectedTaskDetail(res.task);
      }

      await loadTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
    }
  };

  /**
   * Update status from Detail Modal
   */
  const handleDetailUpdateStatus = async (taskId, { status, completionNotes }) => {
    if (!activeCircleId) return;
    try {
      const res = await careTaskApi.updateTaskStatus(activeCircleId, taskId, {
        status,
        completionNotes,
      });

      toast.success(`Task status updated to ${status}.`);
      setSelectedTaskDetail(res.task);
      await loadTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to update task status.');
      throw err;
    }
  };

  /**
   * Delete task handler
   */
  const handleDeleteTask = async (task) => {
    if (!activeCircleId) return;
    const taskId = task.id || task._id;

    if (!window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      await careTaskApi.deleteTask(activeCircleId, taskId);
      toast.success('Task deleted successfully.');
      if (selectedTaskDetail && (selectedTaskDetail.id || selectedTaskDetail._id) === taskId) {
        setSelectedTaskDetail(null);
      }
      await loadTasks();
    } catch (err) {
      toast.error(err.message || 'Failed to delete task.');
    }
  };

  const handleOpenCreateModal = (specificDate = null) => {
    setEditingTask(null);
    setFormInitialDate(specificDate || (activeTab === 'calendar' ? selectedCalendarDate : todayStr));
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setIsFormModalOpen(true);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setCategoryFilter('');
    setPriorityFilter('');
    setTimeSlotFilter('');
    setAssigneeFilter('');
  };

  const hasActiveFilters =
    Boolean(searchQuery) ||
    Boolean(categoryFilter) ||
    Boolean(priorityFilter) ||
    Boolean(timeSlotFilter) ||
    Boolean(assigneeFilter);

  const recipientName = activeRecipient?.fullName || activeCircle?.name || 'Care Recipient';

  // Group tasks by time slot for Today and Upcoming views
  const timeSlotGroupedTasks = useMemo(() => {
    const slots = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
      anytime: [],
    };

    tasks.forEach((t) => {
      const s = t.timeSlot || 'morning';
      if (slots[s]) {
        slots[s].push(t);
      } else {
        slots.anytime.push(t);
      }
    });

    return slots;
  }, [tasks]);

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 rounded-2xl bg-surface-container-low border border-outline-variant/30 shadow-xs">
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider">
            <Icon name="check_box" size={16} />
            <span>Daily Routines & Schedule</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
            Care Tasks for {recipientName}
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed">
            Coordinate daily medication schedules, vitals checks, meals, and family errands together.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">
          <Button
            variant="primary"
            size="md"
            icon="add"
            onClick={() => handleOpenCreateModal()}
            className="font-bold shadow-sm"
          >
            Add Care Task
          </Button>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-1.5 p-1.5 bg-surface-container-low rounded-2xl border border-outline-variant/30 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'today'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="today" size={16} />
          <span>Today</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('upcoming')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'upcoming'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="event_upcoming" size={16} />
          <span>Upcoming Schedule</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calendar')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'calendar'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="calendar_month" size={16} />
          <span>Shared Calendar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'completed'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="done_all" size={16} />
          <span>Completed History</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('workload')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-2 ${
            activeTab === 'workload'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <Icon name="diversity_1" size={16} />
          <span>Caregiver Balance</span>
        </button>
      </div>

      {/* Filter / Search Bar (for task list tabs) */}
      {activeTab !== 'workload' && activeTab !== 'calendar' && (
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            {/* Search query */}
            <div className="sm:col-span-4">
              <Input
                placeholder="Search tasks, medications, notes..."
                icon="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Category Filter */}
            <div className="sm:col-span-3">
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="">All Categories</option>
                {TASK_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {TASK_CATEGORY_LABELS[cat] || cat}
                  </option>
                ))}
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="sm:col-span-2">
              <Select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
              >
                <option value="">All Priorities</option>
                {ALL_TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {TASK_PRIORITY_LABELS[p] || p}
                  </option>
                ))}
              </Select>
            </div>

            {/* Assignee Filter */}
            <div className="sm:col-span-3">
              <Select
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Shared / Unassigned</option>
                {members.map((m) => {
                  const u = m.user;
                  if (!u) return null;
                  const uId = u.id || u._id;
                  return (
                    <option key={uId} value={uId}>
                      {u.name}
                    </option>
                  );
                })}
              </Select>
            </div>
          </div>

          {/* Active filter reset pill */}
          {hasActiveFilters && (
            <div className="flex items-center justify-between pt-2 border-t border-outline-variant/20 text-xs text-on-surface-variant">
              <span>Filtering results</span>
              <button
                type="button"
                onClick={handleClearFilters}
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
              >
                <Icon name="clear" size={14} />
                <span>Reset Filters</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main View Area */}
      {isLoading ? (
        <div className="py-12">
          <LoadingSpinner text="Loading care tasks..." />
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-error-container text-on-error-container text-xs font-semibold flex items-center gap-2">
          <Icon name="error" size={18} />
          <span>{error}</span>
        </div>
      ) : activeTab === 'workload' ? (
        <WorkloadView circleId={activeCircleId} />
      ) : activeTab === 'calendar' ? (
        <CalendarScheduleView
          tasks={tasks}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          onOpenDetail={setSelectedTaskDetail}
          onToggleComplete={handleToggleComplete}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteTask}
          onAddTaskForDate={handleOpenCreateModal}
          canManage={permissions.canManageCircle}
          currentUserId={user?.id || user?._id}
        />
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={
            activeTab === 'today'
              ? 'task_alt'
              : activeTab === 'upcoming'
              ? 'event_available'
              : 'checklist'
          }
          title={
            hasActiveFilters
              ? 'No matching care tasks found'
              : activeTab === 'today'
              ? 'All caught up for today!'
              : activeTab === 'completed'
              ? 'No completed tasks yet'
              : 'No upcoming tasks scheduled'
          }
          description={
            hasActiveFilters
              ? 'Try adjusting your search query or filters.'
              : activeTab === 'today'
              ? 'No care routines or tasks are due today. You can schedule a new routine anytime.'
              : activeTab === 'completed'
              ? 'Completed care tasks and medication logs will appear here.'
              : 'Add upcoming doctors appointments, medicine refills, or physiotherapy sessions.'
          }
          actionLabel={hasActiveFilters ? 'Clear Filters' : '+ Add Care Task'}
          onAction={hasActiveFilters ? handleClearFilters : () => handleOpenCreateModal()}
        />
      ) : (
        /* Task List View Grouped by Time Slot */
        <div className="space-y-6">
          {TASK_TIME_SLOTS.map((slotKey) => {
            const slotList = timeSlotGroupedTasks[slotKey] || [];
            if (slotList.length === 0) return null;

            const slotLabel = TASK_TIME_SLOT_LABELS[slotKey] || slotKey;
            const slotIcon = TASK_TIME_SLOT_LABELS[slotKey] ? 'schedule' : 'task_alt';

            return (
              <div key={slotKey} className="space-y-3">
                {/* Slot Header */}
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant pl-1">
                  <Icon name={slotIcon} size={16} className="text-primary" />
                  <span>{slotLabel}</span>
                  <span className="text-outline">({slotList.length})</span>
                </div>

                {/* Tasks in Slot */}
                <div className="space-y-2.5">
                  {slotList.map((task) => (
                    <TaskCard
                      key={task.id || task._id}
                      task={task}
                      onOpenDetail={setSelectedTaskDetail}
                      onToggleComplete={handleToggleComplete}
                      onEdit={handleOpenEditModal}
                      onDelete={handleDeleteTask}
                      canManage={permissions.canManageCircle}
                      isCreator={task.createdBy?._id === user?.id || task.createdBy === user?.id}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation / Edit Modal */}
      {isFormModalOpen && (
        <TaskFormModal
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingTask(null);
            setFormInitialDate(null);
          }}
          onSubmit={handleFormSubmit}
          initialData={editingTask}
          members={members}
          initialDate={formInitialDate}
        />
      )}

      {/* Task Detail Modal */}
      {selectedTaskDetail && (
        <TaskDetailModal
          isOpen={!!selectedTaskDetail}
          onClose={() => setSelectedTaskDetail(null)}
          task={selectedTaskDetail}
          onUpdateStatus={handleDetailUpdateStatus}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteTask}
          canManage={permissions.canManageCircle}
          isCreator={
            selectedTaskDetail.createdBy?._id === user?.id ||
            selectedTaskDetail.createdBy === user?.id
          }
        />
      )}
    </div>
  );
}
