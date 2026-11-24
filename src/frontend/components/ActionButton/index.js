import React from 'react';
import { Link } from 'react-router-dom';
import { FaEdit, FaList, FaListOl, FaPlay, FaPlus, FaSave, FaTrashAlt } from 'react-icons/fa';

import './styles.css';

const icons = {
    add: FaPlus,
    edit: FaEdit,
    list: FaList,
    alternatives: FaListOl,
    play: FaPlay,
    save: FaSave,
    delete: FaTrashAlt,
};

export function DirectoryActions({ children }) {
    return <div className="tcc-directory-actions">{children}</div>;
}

export function FormActions({ children }) {
    return <div className="tcc-form-actions">{children}</div>;
}

export function ActionButton({ children, to, variant = 'info', type = 'button', icon, size = 'regular', appearance = 'outline', className = '', ...props }) {
    const Icon = icons[icon];
    const outlineClass = appearance === 'outline'
        ? `button button-${variant} action-outline action-outline--${variant}`
        : '';
    const baseClass = Icon ? `action-icon action-icon--${variant}` : outlineClass;
    const compact = size === 'compact';
    const buttonClass = [baseClass, compact && 'action-compact', className].filter(Boolean).join(' ');
    const label = Icon ? <Icon aria-hidden="true" focusable="false" /> : children;
    const content = compact ? <span className="action-face">{label}</span> : label;
    if (to !== undefined) {
        return <Link {...props} className={buttonClass} to={to}>{content}</Link>;
    }

    return <button {...props} className={buttonClass} type={type}>{content}</button>;
}
