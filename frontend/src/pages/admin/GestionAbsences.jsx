import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import StudentPicker, { getStudentLabel, getStudentName } from '../../components/StudentPicker';

const API_URL = 'http://127.0.0.1:8000/api';
const today = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  etudiant: '',
  module: '',
  date: today(),
  justifiee: false,
};

function GestionAbsences() {
  const [absences, setAbsences] = useState([]);
  const [etudiants, setEtudiants] = useState([]);
  const [modules, setModules] = useState([]);
  const [groupes, setGroupes] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');
  const navigate = useNavigate();
  const token = localStorage.getItem('access');
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/absences/`, { headers }),
      axios.get(`${API_URL}/etudiants/`, { headers }),
      axios.get(`${API_URL}/modules/`, { headers }),
      axios.get(`${API_URL}/groupes/`, { headers }),
    ]).then(([absencesRes, etudiantsRes, modulesRes, groupesRes]) => {
      setAbsences(absencesRes.data);
      setEtudiants(etudiantsRes.data);
      setModules(modulesRes.data);
      setGroupes(groupesRes.data);
      setLoading(false);
    }).catch(() => {
      setMessage("Impossible de charger les absences.");
      setMessageType('error');
      setLoading(false);
    });
  }, [headers]);

  useEffect(() => {
    if (!token) {
      navigate('/');
      return;
    }
    loadData();
  }, [loadData, navigate, token]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId('');
  };

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const selectedStudent = useMemo(
    () => etudiants.find((etudiant) => String(etudiant.id) === String(form.etudiant)) || null,
    [etudiants, form.etudiant]
  );

  const handleStudentSelect = (etudiant) => {
    setForm((current) => ({ ...current, etudiant: String(etudiant.id) }));
    setMessage('');
  };

  const startEdit = (absence) => {
    setEditingId(String(absence.id));
    setForm({
      etudiant: String(absence.etudiant || ''),
      module: String(absence.module || ''),
      date: absence.date || today(),
      justifiee: Boolean(absence.justifiee),
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.etudiant) {
      setMessage("Choisissez un etudiant avant d'enregistrer une absence.");
      setMessageType('error');
      return;
    }

    const payload = {
      etudiant: form.etudiant,
      module: form.module,
      date: form.date,
      justifiee: form.justifiee,
    };

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/absences/${editingId}/`, payload, { headers });
        setMessage('Absence modifiee avec succes.');
      } else {
        await axios.post(`${API_URL}/absences/`, payload, { headers });
        setMessage('Absence ajoutee avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadData();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de l'absence.");
      setMessageType('error');
    }
  };

  const deleteAbsence = async (absence) => {
    const confirmed = window.confirm('Supprimer cette absence ?');
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/absences/${absence.id}/`, { headers });
      setAbsences((current) => current.filter((item) => String(item.id) !== String(absence.id)));
      if (String(editingId) === String(absence.id)) resetForm();
      setMessage('Absence supprimee avec succes.');
      setMessageType('success');
    } catch (err) {
      setMessage("Erreur lors de la suppression de l'absence.");
      setMessageType('error');
    }
  };

  const justifieesCount = absences.filter((absence) => absence.justifiee).length;
  const nonJustifieesCount = absences.length - justifieesCount;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion absences</span>
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
            <p className="kicker">Assiduite</p>
            <h1 className="page-title">Gestion des absences</h1>
            <p className="page-description">Creez, justifiez, modifiez et supprimez les absences.</p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des absences">
          <article className="stat-card accent">
            <div className="icon-tile">AB</div>
            <div>
              <div className="stat-value">{absences.length}</div>
              <p className="stat-label">Absences</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">JU</div>
            <div>
              <div className="stat-value">{justifieesCount}</div>
              <p className="stat-label">Justifiees</p>
            </div>
          </article>
          <article className="stat-card warning">
            <div className="icon-tile">NJ</div>
            <div>
              <div className="stat-value">{nonJustifieesCount}</div>
              <p className="stat-label">Non justifiees</p>
            </div>
          </article>
        </section>

        <StudentPicker
          students={etudiants}
          groupes={groupes}
          selectedStudentId={form.etudiant}
          onSelect={handleStudentSelect}
          title="Choisir l'etudiant"
        />

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier une absence' : 'Ajouter une absence'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="absence-etudiant">Etudiant selectionne</label>
              <input
                id="absence-etudiant"
                className="form-control"
                value={selectedStudent ? getStudentLabel(selectedStudent) : ''}
                placeholder="Choisir un etudiant depuis la recherche"
                readOnly
                required
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="absence-module">Module</label>
              <select id="absence-module" name="module" className="form-control" value={form.module} onChange={handleChange} required>
                <option value="">Choisir un module</option>
                {modules.map((module) => (
                  <option key={module.id} value={module.id}>{module.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="absence-date">Date</label>
              <input id="absence-date" name="date" className="form-control" type="date" value={form.date} onChange={handleChange} required />
            </div>
            <label className="check-row">
              <input name="justifiee" type="checkbox" checked={form.justifiee} onChange={handleChange} />
              Absence justifiee
            </label>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit">{editingId ? 'Enregistrer' : "Ajouter l'absence"}</button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Liste des absences</h2>
            <span className="badge badge-warning">{absences.length} absence(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Etudiant</th>
                  <th>Module</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty-state">Chargement...</td></tr>
                ) : absences.length === 0 ? (
                  <tr><td colSpan="5" className="empty-state">Aucune absence enregistree</td></tr>
                ) : absences.map((absence) => (
                  <tr key={absence.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{absence.etudiant_nom || getStudentName(etudiants.find((etudiant) => String(etudiant.id) === String(absence.etudiant))) || `Etudiant ${absence.etudiant}`}</strong>
                        <span className="cell-muted">{absence.etudiant_matricule || '-'}</span>
                      </span>
                    </td>
                    <td>{absence.module_nom || `Module ${absence.module}`}</td>
                    <td>{absence.date || '-'}</td>
                    <td>
                      <span className={`badge ${absence.justifiee ? 'badge-success' : 'badge-danger'}`}>
                        {absence.justifiee ? 'Justifiee' : 'Non justifiee'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(absence)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteAbsence(absence)}>Supprimer</button>
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

export default GestionAbsences;
