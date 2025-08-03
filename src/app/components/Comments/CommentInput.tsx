import React from 'react';
import styles from './Comments.module.scss';

interface CommentInputProps {
  commentText: string;
  setCommentText: (text: string) => void;
  onSave: () => void;
  disabled: boolean;
}

const CommentInput = ({ commentText, setCommentText, onSave, disabled }: CommentInputProps) => {
  return (
    <div>
      <label htmlFor="comment-input">Write a comment</label>
      <textarea
        id="comment-input"
        className={styles.commentInput}
        value={commentText}
        onChange={(e) => setCommentText(e.target.value)}
        placeholder="Write a comment..."
        aria-multiline="true"
      />
      <div className={styles.commentButtons}>
        <button
          className={styles.commentSaveButton}
          onClick={onSave}
          disabled={disabled}
          aria-disabled={disabled}
          aria-label="Save comment"
          type="button"
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default CommentInput;
