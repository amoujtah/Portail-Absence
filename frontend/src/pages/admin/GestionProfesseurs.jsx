import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000/api';

const emptyForm = {
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
};

const isTeacher = (user) => {
  const role = (user.role || '').toLowerCase();
  return ['enseignant', 'professeur', 'prof', 'teacher'].includes(role);
};

function GestionProfesseurs() {
  const [enseignants, setEnseignants] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('access');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadTeachers = useCallback(() => {
    setLoading(true);
    axios.get(`${API_URL}/users/`, { headers }).then((response) => {
      setEnseignants(response.data.filter(isTeacher));
      setLoading(false);
    }).catch(() => {
      setMessage('Impossible de charger les professeurs.');
      setMessageType('error');
      setLoading(false);
    });
  }, [headers]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadTeachers();
  }, [loadTeachers, navigate, token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const teacherName = (enseignant) =>
    `${enseignant.first_name || ''} ${enseignant.last_name || ''}`.trim() || enseignant.username || `Enseignant ${enseignant.id}`;

  const startEdit = (enseignant) => {
    setEditingId(String(enseignant.id));
    setForm({
      username: enseignant.username || '',
      first_name: enseignant.first_name || '',
      last_name: enseignant.last_name || '',
      email: enseignant.email || '',
      password: '',
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const payload = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: 'enseignant',
    };

    if (form.password.trim()) payload.password = form.password;

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/users/${editingId}/`, payload, { headers });
        setMessage('Professeur modifie avec succes.');
      } else {
        await axios.post(`${API_URL}/users/`, payload, { headers });
        setMessage('Professeur ajoute avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadTeachers();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement du professeur.");
      setMessageType('error');
    }
  };

  const deleteTeacher = async (enseignant) => {
    const confirmed = window.confirm(`Supprimer le compte ${teacherName(enseignant)} ?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/users/${enseignant.id}/`, { headers });
      setEnseignants((current) => current.filter((item) => String(item.id) !== String(enseignant.id)));
      if (String(editingId) === String(enseignant.id)) resetForm();
      setMessage('Professeur supprime avec succes.');
      setMessageType('success');
    } catch (err) {
      setMessage('Erreur lors de la suppression du professeur.');
      setMessageType('error');
    }
  };

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion professeurs</span>
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
            <h1 className="page-title">Gestion des professeurs</h1>
            <p className="page-description">Comptes enseignants et acces a l'espace pedagogique.</p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des professeurs">
          <article className="stat-card accent">
            <div className="icon-tile">PR</div>
            <div>
              <div className="stat-value">{enseignants.length}</div>
              <p className="stat-label">Professeurs</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">AC</div>
            <div>
              <div className="stat-value">{enseignants.filter((enseignant) => enseignant.is_active !== false).length}</div>
              <p className="stat-label">Comptes actifs</p>
            </div>
          </article>
          <article className="stat-card">
            <div className="icon-tile">ID</div>
            <div>
              <div className="stat-value">{enseignants.filter((enseignant) => enseignant.email).length}</div>
              <p className="stat-label">Emails renseignes</p>
            </div>
          </article>
        </section>

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier un professeur' : 'Ajouter un professeur'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="teacher-username">Identifiant</label>
              <input id="teacher-username" name="username" className="form-control" value={form.username} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="teacher-password">Mot de passe</label>
              <input
                id="teacher-password"
                name="password"
                className="form-control"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder={editingId ? 'Laisser vide pour conserver' : 'Mot de passe initial'}
                required={!editingId}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="teacher-first-name">Prenom</label>
              <input id="teacher-first-name" name="first_name" className="form-control" value={form.first_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="teacher-last-name">Nom</label>
              <input id="teacher-last-name" name="last_name" className="form-control" value={form.last_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="teacher-email">Email</label>
              <input id="teacher-email" name="email" className="form-control" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label">Role</label>
              <input className="form-control" value="enseignant" disabled />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {editingId ? 'Enregistrer' : 'Ajouter le professeur'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Liste des professeurs</h2>
            <span className="badge badge-primary">{enseignants.length} compte(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Professeur</th>
                  <th>Identifiant</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state">Chargement...</td></tr>
                ) : enseignants.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">Aucun professeur trouve</td></tr>
                ) : enseignants.map((enseignant) => (
                  <tr key={enseignant.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{teacherName(enseignant)}</strong>
                        <span className="cell-muted">#{enseignant.id}</span>
                      </span>
                    </td>
                    <td>{enseignant.username || '-'}</td>
                    <td>{enseignant.email || '-'}</td>
                    <td><span className="badge badge-primary">enseignant</span></td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(enseignant)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteTeacher(enseignant)}>Supprimer</button>
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

export default GestionProfesseurs;
