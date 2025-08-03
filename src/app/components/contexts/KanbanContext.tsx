'use client';

import React, {
  createContext,
  useReducer,
  useMemo,
  type ReactNode,
  type Dispatch,
  useEffect,
  useState,
} from 'react';
import { IColumn, IComment, ITask } from '../types';
import { v4 as uuidv4 } from 'uuid';

// ----------------------------
// Types & State
// ----------------------------

export type KanbanState = {
  columns: IColumn[];
};

export type KanbanAction =
  | { type: 'ADD_COLUMN' }
  | { type: 'RENAME_COLUMN'; columnId: string; newTitle: string }
  | { type: 'DELETE_COLUMN'; columnId: string }
  | { type: 'MOVE_TASK'; taskId: string; fromColumnId: string; toColumnId: string }
  | { type: 'ADD_TASK'; columnId: string; task: ITask }
  | {
      type: 'EDIT_TASK';
      payload: { columnId: string; taskId: string; updatedFields: Partial<ITask> };
    }
  | { type: 'DELETE_TASK'; columnId: string; taskId: string }
  | { type: 'ADD_COMMENT'; columnId: string; taskId: string; comment: IComment }
  | { type: 'EDIT_COMMENT'; columnId: string; taskId: string; commentId: string; content: string }
  | { type: 'DELETE_COMMENT'; columnId: string; taskId: string; commentId: string }
  | { type: '__INIT_LOCAL__'; payload: KanbanState }
  | {
      type: 'ADD_REPLY';
      columnId: string;
      taskId: string;
      parentCommentId: string;
      reply: IComment;
    }
  | { type: 'REORDER_TASKS'; columnId: string; draggedIndex: number | null; index: number };

// ----------------------------
// Default State for Dev Preview
// ----------------------------

const defaultTasks: ITask[] = [
  { id: uuidv4(), title: 'Header', description: '', comments: [] },
  { id: uuidv4(), title: 'Button', description: '', comments: [] },
  { id: uuidv4(), title: 'Integration', description: 'use axios', comments: [] },
];

const initialState: KanbanState = {
  columns: [
    { id: uuidv4(), title: 'To Do', tasks: defaultTasks },
    { id: uuidv4(), title: 'In Progress', tasks: [] },
    { id: uuidv4(), title: 'Done', tasks: [] },
  ],
};

const LOCAL_STORAGE_KEY = 'kanban-board-state';

export const KanbanContext = createContext<{
  state: KanbanState;
  dispatch: Dispatch<KanbanAction>;
} | null>(null);

// ----------------------------
// Reducer Logic
// ----------------------------

const reducer = (state: KanbanState, action: KanbanAction): KanbanState => {
  switch (action.type) {
    case '__INIT_LOCAL__':
      return action.payload;

    case 'ADD_COLUMN':
      return {
        ...state,
        columns: [...state.columns, { id: uuidv4(), title: 'New Column', tasks: [] }],
      };

    case 'RENAME_COLUMN':
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === action.columnId ? { ...col, title: action.newTitle } : col,
        ),
      };

    case 'DELETE_COLUMN':
      return {
        ...state,
        columns: state.columns.filter((col) => col.id !== action.columnId),
      };

    case 'MOVE_TASK': {
      const { taskId, fromColumnId, toColumnId } = action;

      // Ignore if moving to the same column
      if (fromColumnId === toColumnId) return state;

      const taskToMove = state.columns
        .find((col) => col.id === fromColumnId)
        ?.tasks.find((task) => task.id === taskId);

      if (!taskToMove) return state;

      const updatedColumns = state.columns.map((col) => {
        if (col.id === fromColumnId) {
          return {
            ...col,
            tasks: col.tasks.filter((t) => t.id !== taskId),
          };
        }

        if (col.id === toColumnId) {
          return {
            ...col,
            tasks: [...col.tasks, taskToMove],
          };
        }

        return col;
      });

      return { ...state, columns: updatedColumns };
    }

    case 'REORDER_TASKS': {
      const { columnId, draggedIndex, index } = action;

      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== columnId) return col;

          const newTasks = [...col.tasks];

          // Guard clause: invalid indexes
          if (
            draggedIndex == null ||
            draggedIndex < 0 ||
            draggedIndex >= newTasks.length ||
            index < 0 ||
            index > newTasks.length
          ) {
            return col;
          }

          const [moved] = newTasks.splice(draggedIndex, 1);
          if (!moved) return col;

          newTasks.splice(index, 0, moved);
          return { ...col, tasks: newTasks };
        }),
      };
    }

    case 'ADD_TASK': {
      const { columnId, task } = action;
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === columnId ? { ...col, tasks: [...col.tasks, task] } : col,
        ),
      };
    }

    case 'EDIT_TASK': {
      const { columnId, taskId, updatedFields } = action.payload;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) =>
              task.id === taskId ? { ...task, ...updatedFields } : task,
            ),
          };
        }),
      };
    }

    case 'DELETE_TASK': {
      const { columnId, taskId } = action;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.filter((task) => task.id !== taskId),
          };
        }),
      };
    }

    case 'ADD_COMMENT': {
      const { columnId, taskId, comment } = action;
      return {
        ...state,
        columns: state.columns.map((col) => {
          if (col.id !== columnId) return col;
          return {
            ...col,
            tasks: col.tasks.map((task) => {
              if (task.id !== taskId) return task;
              return {
                ...task,
                comments: [...(task.comments || []), comment],
              };
            }),
          };
        }),
      };
    }

    case 'EDIT_COMMENT': {
      const { columnId, taskId, commentId, content } = action;

      /**
       * Recursively traverse the nested comments array to find and update the comment with commentId.
       * For each comment:
       * - If its id matches commentId, return a new comment object with updated content.
       * - Otherwise, if it has replies, recursively call updateComment on the replies array.
       * - If no match and no replies, return the comment unchanged.
       */
      const updateComment = (comments: IComment[]): IComment[] => {
        return comments.map((comment) => {
          if (comment.id === commentId) {
            // Found the comment to edit; update its content immutably
            return { ...comment, content };
          }
          if (comment.replies?.length) {
            // Recursively update any nested replies
            return { ...comment, replies: updateComment(comment.replies) };
          }
          // No changes for this comment
          return comment;
        });
      };

      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id !== columnId
            ? col
            : {
                ...col,
                tasks: col.tasks.map((task) =>
                  task.id !== taskId
                    ? task
                    : { ...task, comments: updateComment(task.comments ?? []) },
                ),
              },
        ),
      };
    }

    case 'DELETE_COMMENT': {
      const { columnId, taskId, commentId } = action;

      /**
       * Recursively filter out the comment with commentId from the comments array and all nested replies.
       * For each comment:
       * - Exclude it if its id matches commentId (deleting it).
       * - Otherwise, keep it, but recursively call deleteCommentRecursively on its replies to remove any nested matches.
       * - Returns a new array without the deleted comment anywhere in the tree.
       */
      const deleteCommentRecursively = (comments: IComment[]): IComment[] =>
        comments
          .filter((c) => c.id !== commentId) // Remove comment if it matches commentId
          .map((c) => ({
            ...c,
            replies: deleteCommentRecursively(c.replies || []), // Recursively apply delete to replies
          }));

      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id !== columnId
            ? col
            : {
                ...col,
                tasks: col.tasks.map((task) =>
                  task.id !== taskId
                    ? task
                    : { ...task, comments: deleteCommentRecursively(task.comments || []) },
                ),
              },
        ),
      };
    }

    case 'ADD_REPLY': {
      const { columnId, taskId, parentCommentId, reply } = action;

      /**
       * Recursively traverse the comments array to find the parent comment by parentCommentId.
       * Once found, append the new reply to the parent's replies array.
       * For each comment:
       * - If its id matches parentCommentId, add the reply to its replies array (creating if undefined).
       * - Otherwise, if it has replies, recursively call addReplyRecursive on the replies.
       * - Returns a new comments array with the reply added in the correct nested location.
       */
      const addReplyRecursive = (comments: IComment[]): IComment[] =>
        comments.map((comment) => {
          if (comment.id === parentCommentId) {
            // Found the comment to reply to: add the new reply immutably
            return {
              ...comment,
              replies: [...(comment.replies || []), reply],
            };
          }
          // Recursively traverse nested replies to find parentCommentId deeper
          return {
            ...comment,
            replies: comment.replies ? addReplyRecursive(comment.replies) : [],
          };
        });

      return {
        ...state,
        columns: state.columns.map((column) =>
          column.id !== columnId
            ? column
            : {
                ...column,
                tasks: column.tasks.map((task) =>
                  task.id !== taskId
                    ? task
                    : {
                        ...task,
                        comments: addReplyRecursive(task.comments || []),
                      },
                ),
              },
        ),
      };
    }

    default:
      return state;
  }
};

export const KanbanProvider = ({ children }: { children: ReactNode }) => {
  const [hasMounted, setHasMounted] = useState(false);
  const [state, dispatch] = useReducer(reducer, initialState);

  // Load state from localStorage once on mount
  useEffect(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        dispatch({ type: '__INIT_LOCAL__', payload: parsed });
      } catch {
        console.warn('Failed to parse saved Kanban state');
      }
    }
    setHasMounted(true);
  }, []);

  // Save state to localStorage when changed
  useEffect(() => {
    if (hasMounted) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, hasMounted]);

  const contextValue = useMemo(() => ({ state, dispatch }), [state]);

  return <KanbanContext.Provider value={contextValue}>{children}</KanbanContext.Provider>;
};
