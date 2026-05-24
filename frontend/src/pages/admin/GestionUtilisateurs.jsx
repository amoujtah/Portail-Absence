import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StudentPicker, { getStudentName } from '../../components/StudentPicker';

const API_URL = 'http://127.0.0.1:8000/api';

const emptyForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  role: 'etudiant',
  password: '',
};

function GestionUtilisateurs() {
  const [users, setUsers] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('access');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadUsers = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/users/`, { headers }),
      axios.get(`${API_URL}/profil/`, { headers }),
      axios.get(`${API_URL}/etudiants/`, { headers }),
      axios.get(`${API_URL}/groupes/`, { headers }),
    ]).then(([usersRes, profileRes, etudiantsRes, groupesRes]) => {
      setUsers(usersRes.data);
      setProfile(profileRes.data);
      setEtudiants(etudiantsRes.data);
      setGroupes(groupesRes.data);
      setLoading(false);
    }).catch(() => {
      setMessage("Impossible de charger les utilisateurs.");
      setMessageType('error');
      setLoading(false);
    });
  }, [headers]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadUsers();
  }, [loadUsers, navigate, token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
    setSelectedStudentId('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const startEdit = (user) => {
    const linkedStudent = etudiants.find((etudiant) => String(etudiant.user) === String(user.id));
    setEditingId(String(user.id));
    setSelectedStudentId(linkedStudent ? String(linkedStudent.id) : '');
    setForm({
      username: user.username || '',
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      email: user.email || '',
      role: user.role || 'etudiant',
      password: '',
    });
    setMessage('');
  };

  const handleStudentSelect = (etudiant) => {
    setSelectedStudentId(String(etudiant.id));
    const linkedUser = users.find((user) => String(user.id) === String(etudiant.user));

    if (!linkedUser) {
      setMessage("Aucun compte utilisateur lie a cet etudiant.");
      setMessageType('error');
      return;
    }

    startEdit(linkedUser);
    setMessage(`Compte etudiant charge: ${getStudentName(etudiant)}.`);
    setMessageType('success');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: form.role,
    };

    if (form.password.trim()) payload.password = form.password;

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/users/${editingId}/`, payload, { headers });
        setMessage('Utilisateur modifie avec succes.');
      } else {
        await axios.post(`${API_URL}/users/`, payload, { headers });
        setMessage('Utilisateur cree avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadUsers();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de l'utilisateur.");
      setMessageType('error');
    }
  };

  const deleteUser = async (user) => {
    if (String(user.id) === String(profile?.id)) {
      setMessage('Vous ne pouvez pas supprimer votre propre compte connecte.');
      setMessageType('error');
      return;
    }

    const confirmed = window.confirm(`Supprimer le compte ${user.username} ?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/users/${user.id}/`, { headers });
      setUsers((current) => current.filter((item) => String(item.id) !== String(user.id)));
      setMessage('Utilisateur supprime avec succes.');
      setMessageType('success');
      if (String(editingId) === String(user.id)) resetForm();
    } catch (err) {
      setMessage("Erreur lors de la suppression de l'utilisateur.");
      setMessageType('error');
    }
  };

  const adminsCount = users.filter((user) => (user.role || '').toLowerCase() === 'admin').length;
  const enseignantsCount = users.filter((user) => (user.role || '').toLowerCase() === 'enseignant').length;
  const etudiantsCount = users.filter((user) => (user.role || '').toLowerCase() === 'etudiant').length;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion utilisateurs</span>
          </div>
        </div>
        <div className="nav-actions">
          <button className="btn btn-soft" type="button" onClick={() => navigate('/dashboard')}>Dashboard</button>
          <button className="btn btn-accent" type="button" onClick={() => { localStorage.clear(); navigate('/'); }}>Deconnexion</button>
        </div>
      </nav>

      <main className="page page-wide">
        <header className="page-header">
          <div>
            <p className="kicker">Administration</p>
            <h1 className="page-title">Gestion des utilisateurs</h1>
            <p className="page-description">
              Creez les comptes et attribuez le bon role: admin, enseignant ou etudiant.
            </p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des utilisateurs">
          <article className="stat-card accent">
            <div className="icon-tile">AD</div>
            <div>
              <div className="stat-value">{adminsCount}</div>
              <p className="stat-label">Admins</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">EN</div>
            <div>
              <div className="stat-value">{enseignantsCount}</div>
              <p className="stat-label">Enseignants</p>
            </div>
          </article>
          <article className="stat-card">
            <div className="icon-tile">ET</div>
            <div>
              <div className="stat-value">{etudiantsCount}</div>
              <p className="stat-label">Etudiants</p>
            </div>
          </article>
        </section>

        <StudentPicker
          students={etudiants}
          groupes={groupes}
          selectedStudentId={selectedStudentId}
          onSelect={handleStudentSelect}
          title="Choisir un compte etudiant"
        />

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier un utilisateur' : 'Nouvel utilisateur'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="username">Identifiant</label>
              <input id="username" name="username" className="form-control" value={form.username} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="first_name">Prenom</label>
              <input id="first_name" name="first_name" className="form-control" value={form.first_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="last_name">Nom</label>
              <input id="last_name" name="last_name" className="form-control" value={form.last_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="email">Email</label>
              <input id="email" name="email" className="form-control" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="role">Role</label>
              <select id="role" name="role" className="form-control" value={form.role} onChange={handleChange}>
                <option value="admin">Admin</option>
                <option value="enseignant">Enseignant</option>
                <option value="etudiant">Etudiant</option>
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="password">Mot de passe</label>
              <input
                id="password"
                name="password"
                className="form-control"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={editingId ? 'Laisser vide pour garder le mot de passe' : 'Mot de passe initial'}
                required={!editingId}
              />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">
                {editingId ? 'Enregistrer' : 'Creer le compte'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Comptes existants</h2>
            <span className="badge badge-primary">{users.length} utilisateur(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Identifiant</th>
                  <th>Nom complet</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state">Chargement...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">Aucun utilisateur trouve</td></tr>
                ) : users.map((user) => (
                  <tr key={user.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{user.username}</strong>
                        <span className="cell-muted">#{user.id}</span>
                      </span>
                    </td>
                    <td>{`${user.first_name || ''} ${user.last_name || ''}`.trim() || '-'}</td>
                    <td>{user.email || '-'}</td>
                    <td><span className="badge badge-primary">{user.role || '-'}</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(user)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteUser(user)}>Supprimer</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}

export default GestionUtilisateurs;
