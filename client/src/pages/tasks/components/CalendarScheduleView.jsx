import React, { useState, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Icon } from '../../../components/ui/Icon';
import { EmptyState } from '../../../components/ui/EmptyState';
import { TaskCard } from './TaskCard';
import { TASK_TIME_SLOTS, TASK_TIME_SLOT_LABELS, TASK_TIME_SLOT_ICONS } from '../../../constants/roles';

export function CalendarScheduleView({
  tasks = [],
  selectedDate,
  onSelectDate,
  onOpenDetail,
  onToggleComplete,
  onEdit,
  onDelete,
  onAddTaskForDate,
  canManage = false,
  currentUserId = null,
}) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to format date to YYYY-MM-DD in local time
  const formatYMD = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Group tasks by date for calendar dot indicators
  const tasksByDate = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => {
      if (t.dueDate) {
        if (!map.has(t.dueDate)) map.set(t.dueDate, []);
        map.get(t.dueDate).push(t);
      }
    });
    return map;
  }, [tasks]);

  // Calendar matrix for currentMonth
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 for Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Previous month padding
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthTotalDays - i);
      days.push({
        dateStr: formatYMD(d),
        dayNum: d.getDate(),
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        dateStr: formatYMD(d),
        dayNum: i,
        isCurrentMonth: true,
      });
    }

    // Next month padding to round up to complete weeks (multiple of 7)
    const remainingDays = 7 - (days.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        const d = new Date(year, month + 1, i);
        days.push({
          dateStr: formatYMD(d),
          dayNum: i,
          isCurrentMonth: false,
        });
      }
    }

    return days;
  }, [currentMonth]);

  // Tasks for the selected date
  const selectedDateTasks = useMemo(() => {
    return tasks.filter((t) => t.dueDate === selectedDate);
  }, [tasks, selectedDate]);

  // Tasks organized by time slot for the selected date
  const timeSlotTasks = useMemo(() => {
    const slots = {
      morning: [],
      afternoon: [],
      evening: [],
      night: [],
      anytime: [],
    };

    selectedDateTasks.forEach((t) => {
      const s = t.timeSlot || 'morning';
      if (slots[s]) {
        slots[s].push(t);
      } else {
        slots.anytime.push(t);
      }
    });

    return slots;
  }, [selectedDateTasks]);

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleTodayClick = () => {
    const today = new Date();
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    onSelectDate(todayStr);
  };

  const selectedDateTitle = useMemo(() => {
    if (!selectedDate) return '';
    if (selectedDate === todayStr) return 'Today';
    try {
      const parts = selectedDate.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }).format(d);
    } catch {
      return selectedDate;
    }
  }, [selectedDate, todayStr]);

  const monthHeaderString = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(currentMonth);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (5 Cols): Calendar Grid Selector */}
      <div className="lg:col-span-5 space-y-4">
        <Card variant="lowest" padding="md" className="shadow-xs border border-outline-variant/30">
          {/* Month Header Nav */}
          <div className="flex items-center justify-between pb-3 border-b border-outline-variant/30">
            <h3 className="font-serif text-base font-bold text-on-surface">
              {monthHeaderString}
            </h3>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTodayClick}
                className="text-xs font-bold px-2 h-7"
              >
                Today
              </Button>
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Previous month"
              >
                <Icon name="chevron_left" size={18} />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
                aria-label="Next month"
              >
                <Icon name="chevron_right" size={18} />
              </button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 mt-3 text-center">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
              <span key={idx} className="text-[11px] font-bold text-outline py-1">
                {day}
              </span>
            ))}
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-1 mt-1">
            {calendarDays.map(({ dateStr, dayNum, isCurrentMonth }) => {
              const isSelected = dateStr === selectedDate;
              const isToday = dateStr === todayStr;
              const dayTasks = tasksByDate.get(dateStr) || [];
              const hasTasks = dayTasks.length > 0;
              const hasUrgent = dayTasks.some(
                (t) => (t.priority === 'URGENT' || t.priority === 'HIGH') && t.status !== 'COMPLETED'
              );

              return (
                <button
                  key={dateStr}
                  type="button"
                  onClick={() => onSelectDate(dateStr)}
                  className={`relative h-10 rounded-xl flex flex-col items-center justify-center text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : isToday
                      ? 'border border-primary text-primary font-bold bg-primary-container/10'
                      : isCurrentMonth
                      ? 'text-on-surface hover:bg-surface-container-high'
                      : 'text-outline/40 hover:bg-surface-container-low'
                  }`}
                >
                  <span>{dayNum}</span>

                  {/* Task Indicator Dot */}
                  {hasTasks && (
                    <span
                      className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                        isSelected
                          ? 'bg-on-primary'
                          : hasUrgent
                          ? 'bg-error animate-pulse'
                          : 'bg-primary'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-3 border-t border-outline-variant/30 flex items-center justify-between text-[11px] text-on-surface-variant">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary inline-block" />
              <span>Has Tasks</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-error inline-block" />
              <span>Urgent Task</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full border border-primary inline-block" />
              <span>Today</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Right Column (7 Cols): Selected Date Timeline Schedule */}
      <div className="lg:col-span-7 space-y-4">
        {/* Schedule Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Schedule Overview
            </div>
            <h3 className="font-serif text-xl font-bold text-on-surface mt-0.5">
              {selectedDateTitle}
            </h3>
            <span className="text-xs text-on-surface-variant">
              {selectedDateTasks.length}{' '}
              {selectedDateTasks.length === 1 ? 'task scheduled' : 'tasks scheduled'}
            </span>
          </div>

          <Button
            variant="primary"
            size="sm"
            icon="add"
            onClick={() => onAddTaskForDate && onAddTaskForDate(selectedDate)}
            className="font-bold shrink-0 self-start sm:self-center"
          >
            + Add Task
          </Button>
        </div>

        {/* Selected Date Timeline */}
        {selectedDateTasks.length === 0 ? (
          <EmptyState
            icon="calendar_month"
            title="No tasks on this date"
            description={`No care tasks or routines are scheduled for ${selectedDateTitle}.`}
            actionLabel="+ Add task for this date"
            onAction={() => onAddTaskForDate && onAddTaskForDate(selectedDate)}
          />
        ) : (
          <div className="space-y-4">
            {TASK_TIME_SLOTS.map((slotKey) => {
              const slotList = timeSlotTasks[slotKey] || [];
              if (slotList.length === 0) return null;

              const slotLabel = TASK_TIME_SLOT_LABELS[slotKey] || slotKey;
              const slotIcon = TASK_TIME_SLOT_ICONS[slotKey] || 'schedule';

              return (
                <div key={slotKey} className="space-y-2.5">
                  {/* Slot Header */}
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-on-surface-variant pl-1">
                    <Icon name={slotIcon} size={16} className="text-primary" />
                    <span>{slotLabel}</span>
                    <span className="text-outline">({slotList.length})</span>
                  </div>

                  {/* Tasks in Slot */}
                  <div className="space-y-2">
                    {slotList.map((task) => (
                      <TaskCard
                        key={task.id || task._id}
                        task={task}
                        onOpenDetail={onOpenDetail}
                        onToggleComplete={onToggleComplete}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        canManage={canManage}
                        isCreator={task.createdBy?._id === currentUserId || task.createdBy === currentUserId}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
