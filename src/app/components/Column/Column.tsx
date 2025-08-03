'use client';

import React, { useEffect, useRef, useState } from 'react';
import styles from './Column.module.scss';
import TaskCard from '../TaskCard/TaskCard';
import { IColumn } from '../types';
import { useKanban } from '../hooks/useKanban';
import AddTaskForm from '../TaskCard/AddTaskForm';
import Modal from '../Modal/Modal';
import { v4 as uuidv4 } from 'uuid';

interface ColumnProps {
  column: IColumn;
}

const Column = ({ column }: ColumnProps) => {
  const { moveTask, renameColumn, deleteColumn, addTask, reorderTasks } = useKanban();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(column.title);
  const [addingTask, setAddingTask] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    // Set data for cross-column dragging
    e.dataTransfer.setData('taskId', column.tasks[index].id);
    e.dataTransfer.setData('fromColumnId', column.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    reorderTasks(column.id, draggedIndex, index);
    setDraggedIndex(index);
  };

  const handleDrop = (e: React.DragEvent) => {
    const taskId = e.dataTransfer.getData('taskId');
    const fromColumnId = e.dataTransfer.getData('fromColumnId');

    // Only move if it's from a different column
    if (taskId && fromColumnId && fromColumnId !== column.id) {
      moveTask(taskId, fromColumnId, column.id);
    }
  };

  const handleRename = () => {
    const updateTitle = newTitle.trim() || column.title;
    renameColumn(column.id, updateTitle);
    setEditingTitle(false);
    setMenuOpen(false);
  };

  const handleDelete = () => {
    const confirmed = window.confirm('Are you sure you want to delete this column?');
    if (confirmed) {
      deleteColumn(column.id);
      setMenuOpen(false);
    }
  };

  const onAddTask = (title: string, description: string) => {
    addTask(column.id, {
      id: uuidv4(),
      title,
      description,
    });
    setAddingTask(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <section
      className={styles.column}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      aria-label={`Column: ${column.title}`}
      role="region"
    >
      <header className={styles.columnHeader}>
        {editingTitle ? (
          <input
            className={styles.titleInput}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
            aria-label="Edit column title"
          />
        ) : (
          <h2 className={styles.title}>{column.title}</h2>
        )}
        <div className={styles.menuWrapper} ref={menuRef}>
          <button
            className={styles.menuButton}
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open column options"
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu">
              <button onClick={() => setEditingTitle(true)} role="menuitem">
                Rename
              </button>
              <button onClick={handleDelete} role="menuitem">
                Delete
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Task List */}
      <ul className={styles.taskList} aria-label={`Tasks in ${column.title}`}>
        {column.tasks?.map((task, index) => (
          <li
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
          >
            <TaskCard task={task} columnId={column.id} />
          </li>
        ))}
      </ul>

      <button
        className={styles.addTaskButton}
        onClick={() => setAddingTask((v) => !v)}
        aria-label="Add a new task"
      >
        ＋ Add Task
      </button>

      {/* Modal for Adding Task */}
      {addingTask && (
        <Modal onClose={() => setAddingTask(false)}>
          <AddTaskForm onSubmit={onAddTask} onCancel={() => setAddingTask(false)} />
        </Modal>
      )}
    </section>
  );
};

export default Column;
