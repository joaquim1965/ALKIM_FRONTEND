/**
 * UserList.jsx
 *
 * Componente LÓGICO (Controller) para la gestión de usuarios.
 * Sigue el patrón "Dual React" y MVC.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useStore } from '../../hooks/useStore';
import { useTmTr } from '../../contexts/TmTrContext';
import userService from '../../services/userService';
import UserListStyled from './UserListStyled';

const UserList = ({ grupo }) => {
    const { t } = useTmTr('UserSettings');
    const { user: currentUser } = useStore();

    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [editUser, setEditUser] = useState(null); // null = cerrado, object = editando/viendo
    const [showAdd, setShowAdd] = useState(false);

    const myRol = currentUser ? parseInt(currentUser.rol) : 0;
    const isAdmin = myRol >= 2;

    // --- FETCH USERS ---
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            // El servicio ya maneja la lógica de filtrar por grupo en el backend
            const res = await userService.getGroupUsers({ grupo });
            if (res.success && Array.isArray(res.data)) {
                setUsers(res.data);
            } else if (res.success) {
                setUsers([]); // Evitar que DataTable reciba algo que no sea array
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers, grupo]);

    // --- HANDLERS ---
    const handleViewEdit = async (u, mode = 'edit') => {
        try {
            const res = await userService.getUserDetail(u.uid);
            if (res.success) {
                setEditUser({ ...res.data, mode });
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleDelete = async (u) => {
        try {
            await userService.deleteUser(u.uid);
            setMessage({ type: 'success', text: 'Usuario eliminado correctamente' });
            fetchUsers();
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
        }
    };

    const handleSaveUser = async (uid, data, section) => {
        if (section === 'refresh_only') {
            fetchUsers();
            return;
        }
        try {
            let res;
            if (section === 'profile') {
                res = await userService.updateUserProfile(uid, data);
            } else if (section === 'prefs') {
                res = await userService.updateUserPreferences(uid, data);
            } else if (section === 'security') {
                res = await userService.updateUserSecurity(uid, data);
            }

            if (res?.success) {
                setMessage({ type: 'success', text: 'Cambios guardados correctamente' });
                if (uid === currentUser.uid) {
                    // Si me edito a mí mismo, quizás convenga refrescar el store global
                    // Pero por ahora refrescamos la lista
                }
                fetchUsers();
                return true;
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            return false;
        }
    };

    const handleCreateUser = async (data) => {
        try {
            const res = await userService.createUser(data);
            if (res.success) {
                setMessage({ type: 'success', text: 'Usuario creado correctamente' });
                setShowAdd(false);
                fetchUsers();
                return true;
            }
        } catch (err) {
            setMessage({ type: 'error', text: err.message });
            return false;
        }
    };

    return (
        <UserListStyled
            users={users}
            loading={loading}
            message={message}
            setMessage={setMessage}
            currentUser={currentUser}
            isAdmin={isAdmin}
            onView={(u) => handleViewEdit(u, 'view')}
            onEdit={(u) => handleViewEdit(u, 'edit')}
            onDelete={handleDelete}
            onAdd={() => setShowAdd(true)}
            editUser={editUser}
            setEditUser={setEditUser}
            showAdd={showAdd}
            setShowAdd={setShowAdd}
            onSaveUser={handleSaveUser}
            onCreateUser={handleCreateUser}
            t={t}
        />
    );
};

export default UserList;
