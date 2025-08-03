'use client';

import React, { useState } from 'react';
import styles from './Comments.module.scss';
import { IComment } from '../types';
import { useKanban } from '../hooks/useKanban';
import { v4 as uuidv4 } from 'uuid';

interface CommentListProps {
  comments: IComment[];
  columnId: string;
  taskId: string;
  parentId?: string;
  editingCommentId: string | null;
  setEditingCommentId: (id: string | null) => void;
  editText: string;
  setEditText: (val: string) => void;
  editComment: (colId: string, taskId: string, commentId: string, newText: string) => void;
  deleteComment: (colId: string, taskId: string, commentId: string) => void;
  clearInputs: () => void;
}

const CommentList = ({
  comments,
  columnId,
  taskId,
  parentId,
  editingCommentId,
  setEditingCommentId,
  editText,
  setEditText,
  editComment,
  deleteComment,
  clearInputs,
}: CommentListProps) => {
  const { addReply } = useKanban();

  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [collapsedComments, setCollapsedComments] = useState<Record<string, boolean>>({});

  // Toggles visibility of nested replies
  const toggleCollapse = (commentId: string) => {
    setCollapsedComments((prev) => ({
      ...prev,
      [commentId]: !prev[commentId],
    }));
  };

  const handleReplySubmit = (commentId: string) => {
    if (!replyText.trim()) return;

    addReply(columnId, taskId, commentId, {
      id: uuidv4(),
      content: replyText.trim(),
      replies: [],
    });

    setReplyText('');
    setActiveReplyId(null);
  };

  // Base case: show this if no comments exist and this is the top-level
  if (!comments.length && !parentId) {
    return <div className={styles.empty}>No comments yet</div>;
  }

  return (
    <div className={styles.commentsList} role="list" aria-label="Comment list">
      {comments.map((comment) => (
        <div key={comment.id} className={styles.commentItem} role="listitem">
          {editingCommentId === comment.id ? (
            <div className={styles.commentEditWrapper}>
              <textarea
                className={styles.commentInput}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                aria-label="Edit comment"
              />
              <div className={styles.commentButtons}>
                <button
                  className={styles.commentSaveButton}
                  onClick={() => {
                    if (editText.trim()) {
                      editComment(columnId, taskId, comment.id, editText.trim());
                      clearInputs();
                    }
                  }}
                  disabled={!editText.trim()}
                  aria-label="Save edited comment"
                >
                  Save
                </button>
                <button
                  className={styles.commentCancelButton}
                  onClick={clearInputs}
                  aria-label="Cancel editing comment"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div
              className={styles.commentDisplay}
              onClick={(e) => {
                // Prevent collapse toggle when clicking buttons
                if ((e.target as HTMLElement).tagName === 'BUTTON') return;

                // Toggle replies visibility if comment has replies
                if (comment.replies && comment.replies?.length > 0) toggleCollapse(comment.id);
              }}
              role="button"
              tabIndex={0}
              aria-label="Toggle replies"
            >
              <div className={styles.commentContentWrapper}>
                <div className={styles.content}>{comment.content}</div>
              </div>
              <div className={styles.commentActions}>
                <button onClick={() => setActiveReplyId(comment.id)} aria-label="Reply to comment">
                  ↩
                </button>
                <button
                  onClick={() => {
                    setEditText(comment.content);
                    setEditingCommentId(comment.id);
                  }}
                  aria-label="Edit comment"
                >
                  ✎
                </button>
                <button
                  onClick={() => deleteComment(columnId, taskId, comment.id)}
                  aria-label="Delete comment"
                >
                  🗑
                </button>
              </div>
            </div>
          )}

          {/* Reply box */}
          {activeReplyId === comment.id && (
            <div className={styles.replyBox}>
              <textarea
                className={styles.commentInput}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                aria-label="Write a reply"
              />
              <div className={styles.commentButtons}>
                <button
                  className={styles.commentSaveButton}
                  onClick={() => handleReplySubmit(comment.id)}
                  disabled={!replyText.trim()}
                  aria-label="Submit reply"
                >
                  Reply
                </button>
                <button
                  className={styles.commentCancelButton}
                  onClick={() => {
                    setReplyText('');
                    setActiveReplyId(null);
                  }}
                  aria-label="Cancel reply"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Recursively render replies */}
          {comment.replies && comment.replies.length > 0 && !collapsedComments[comment.id] && (
            <div className={styles.subcomments}>
              <CommentList
                comments={comment.replies}
                columnId={columnId}
                taskId={taskId}
                parentId={comment.id}
                editingCommentId={editingCommentId}
                setEditingCommentId={setEditingCommentId}
                editText={editText}
                setEditText={setEditText}
                editComment={editComment}
                deleteComment={deleteComment}
                clearInputs={clearInputs}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CommentList;
