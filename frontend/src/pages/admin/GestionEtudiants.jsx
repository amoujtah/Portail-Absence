import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const API_URL = 'http://127.0.0.1:8000/api';

const emptyForm = {
  user: '',
  username: '',
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  filiere: '',
  groupe: '',
  niveau: '1A',
  annee: '1',
  cycle: 'preparatoire',
  matricule: '',
  telephone: '',
  adresse: '',
  ville: '',
  cin: '',
  date_naissance: '',
};

const cycles = [
  { value: 'preparatoire', label: 'Preparatoire' },
  { value: 'ingenieur', label: 'Ingenieur' },
  { value: 'master', label: 'Master' },
];

const niveaux = ['1A', '2A', '3A', '4A', '5A'];

function GestionEtudiants() {
  const [etudiants, setEtudiants] = useState([]);
  const [filieres, setFilieres] = useState([]);
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
      axios.get(`${API_URL}/etudiants/`, { headers }),
      axios.get(`${API_URL}/filieres/`, { headers }),
      axios.get(`${API_URL}/groupes/`, { headers }),
    ]).then(([etudiantsRes, filieresRes, groupesRes]) => {
      setEtudiants(etudiantsRes.data);
      setFilieres(filieresRes.data);
      setGroupes(groupesRes.data);
      setLoading(false);
    }).catch(() => {
      setMessage('Impossible de charger les etudiants.');
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

  const applyGroupDefaults = (groupeId, currentForm) => {
    const groupe = groupes.find((item) => String(item.id) === String(groupeId));
    if (!groupe) return currentForm;

    return {
      ...currentForm,
      groupe: String(groupe.id),
      filiere: String(groupe.filiere || currentForm.filiere),
      niveau: groupe.niveau || currentForm.niveau,
      annee: String(groupe.annee || currentForm.annee),
      cycle: groupe.cycle || currentForm.cycle,
    };
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => {
      const next = { ...current, [name]: value };
      return name === 'groupe' ? applyGroupDefaults(value, next) : next;
    });
  };

  const studentName = (etudiant) =>
    `${etudiant.nom || ''} ${etudiant.prenom || ''}`.trim() || etudiant.user_nom || `Etudiant ${etudiant.id}`;

  const startEdit = (etudiant) => {
    setEditingId(String(etudiant.id));
    setForm({
      user: String(etudiant.user || ''),
      username: etudiant.username || '',
      first_name: etudiant.prenom || '',
      last_name: etudiant.nom || '',
      email: etudiant.email || '',
      password: '',
      filiere: String(etudiant.filiere || ''),
      groupe: String(etudiant.groupe || ''),
      niveau: etudiant.niveau || '1A',
      annee: String(etudiant.annee || '1'),
      cycle: etudiant.cycle || 'preparatoire',
      matricule: etudiant.matricule || '',
      telephone: etudiant.telephone || '',
      adresse: etudiant.adresse || '',
      ville: etudiant.ville || '',
      cin: etudiant.cin || '',
      date_naissance: etudiant.date_naissance || '',
    });
    setMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const userPayload = {
      username: form.username.trim(),
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      email: form.email.trim(),
      role: 'etudiant',
    };

    if (form.password.trim()) userPayload.password = form.password;

    const studentPayload = {
      filiere: form.filiere || null,
      groupe: form.groupe || null,
      niveau: form.niveau,
      annee: Number(form.annee),
      cycle: form.cycle,
      matricule: form.matricule.trim() || null,
      telephone: form.telephone.trim(),
      adresse: form.adresse.trim(),
      ville: form.ville.trim(),
      cin: form.cin.trim(),
      date_naissance: form.date_naissance || null,
    };

    try {
      if (editingId) {
        await axios.patch(`${API_URL}/users/${form.user}/`, userPayload, { headers });
        await axios.patch(`${API_URL}/etudiants/${editingId}/`, { ...studentPayload, user: form.user }, { headers });
        setMessage('Etudiant modifie avec succes.');
      } else {
        const userRes = await axios.post(`${API_URL}/users/`, { ...userPayload, password: form.password }, { headers });
        await axios.post(`${API_URL}/etudiants/`, { ...studentPayload, user: userRes.data.id }, { headers });
        setMessage('Etudiant ajoute avec succes.');
      }
      setMessageType('success');
      resetForm();
      loadData();
    } catch (err) {
      setMessage("Erreur lors de l'enregistrement de l'etudiant.");
      setMessageType('error');
    }
  };

  const deleteEtudiant = async (etudiant) => {
    const confirmed = window.confirm(`Supprimer le dossier de ${studentName(etudiant)} ?`);
    if (!confirmed) return;

    try {
      await axios.delete(`${API_URL}/etudiants/${etudiant.id}/`, { headers });
      setEtudiants((current) => current.filter((item) => String(item.id) !== String(etudiant.id)));
      if (String(editingId) === String(etudiant.id)) resetForm();
      setMessage('Etudiant supprime avec succes.');
      setMessageType('success');
    } catch (err) {
      setMessage("Erreur lors de la suppression de l'etudiant.");
      setMessageType('error');
    }
  };

  const sansGroupe = etudiants.filter((etudiant) => !etudiant.groupe).length;
  const groupesActifs = new Set(etudiants.map((etudiant) => etudiant.groupe_code).filter(Boolean)).size;

  return (
    <div className="app-shell">
      <nav className="app-nav">
        <div className="brand">
          <div className="brand-mark">PA</div>
          <div className="brand-text">
            <span className="brand-title">Portail Absences</span>
            <span className="brand-subtitle">Gestion etudiants</span>
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
            <h1 className="page-title">Gestion des etudiants</h1>
            <p className="page-description">Dossiers, groupes et informations administratives des etudiants.</p>
          </div>
        </header>

        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-danger'}`}>{message}</div>
        )}

        <section className="stats-grid" aria-label="Resume des etudiants">
          <article className="stat-card accent">
            <div className="icon-tile">ET</div>
            <div>
              <div className="stat-value">{etudiants.length}</div>
              <p className="stat-label">Etudiants</p>
            </div>
          </article>
          <article className="stat-card success">
            <div className="icon-tile">GR</div>
            <div>
              <div className="stat-value">{groupesActifs}</div>
              <p className="stat-label">Groupes actifs</p>
            </div>
          </article>
          <article className="stat-card warning">
            <div className="icon-tile">SG</div>
            <div>
              <div className="stat-value">{sansGroupe}</div>
              <p className="stat-label">Sans groupe</p>
            </div>
          </article>
        </section>

        <section className="panel admin-crud-panel">
          <div className="panel-header">
            <h2 className="panel-title">{editingId ? 'Modifier un etudiant' : 'Ajouter un etudiant'}</h2>
            {editingId && <button className="btn btn-soft" type="button" onClick={resetForm}>Annuler</button>}
          </div>
          <form className="form-grid admin-form-grid" onSubmit={handleSubmit}>
            <div className="form-field">
              <label className="form-label" htmlFor="student-username">Identifiant</label>
              <input id="student-username" name="username" className="form-control" value={form.username} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-password">Mot de passe</label>
              <input
                id="student-password"
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
              <label className="form-label" htmlFor="student-first-name">Prenom</label>
              <input id="student-first-name" name="first_name" className="form-control" value={form.first_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-last-name">Nom</label>
              <input id="student-last-name" name="last_name" className="form-control" value={form.last_name} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-email">Email</label>
              <input id="student-email" name="email" className="form-control" type="email" value={form.email} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-matricule">Matricule</label>
              <input id="student-matricule" name="matricule" className="form-control" value={form.matricule} onChange={handleChange} placeholder="Ex: EMSI2026-GL001" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-groupe">Groupe</label>
              <select id="student-groupe" name="groupe" className="form-control" value={form.groupe} onChange={handleChange}>
                <option value="">Sans groupe</option>
                {groupes.map((groupe) => (
                  <option key={groupe.id} value={groupe.id}>
                    {groupe.code} - {groupe.filiere_code || groupe.niveau}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-filiere">Filiere</label>
              <select id="student-filiere" name="filiere" className="form-control" value={form.filiere} onChange={handleChange}>
                <option value="">Sans filiere</option>
                {filieres.map((filiere) => (
                  <option key={filiere.id} value={filiere.id}>{filiere.code || filiere.nom} - {filiere.nom}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-niveau">Niveau</label>
              <select id="student-niveau" name="niveau" className="form-control" value={form.niveau} onChange={handleChange} required>
                {niveaux.map((niveau) => <option key={niveau} value={niveau}>{niveau}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-annee">Annee</label>
              <input id="student-annee" name="annee" className="form-control" type="number" min="1" max="5" value={form.annee} onChange={handleChange} required />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-cycle">Cycle</label>
              <select id="student-cycle" name="cycle" className="form-control" value={form.cycle} onChange={handleChange} required>
                {cycles.map((cycle) => <option key={cycle.value} value={cycle.value}>{cycle.label}</option>)}
              </select>
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-telephone">Telephone</label>
              <input id="student-telephone" name="telephone" className="form-control" value={form.telephone} onChange={handleChange} placeholder="Ex: 0612345678" />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-cin">CIN</label>
              <input id="student-cin" name="cin" className="form-control" value={form.cin} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-ville">Ville</label>
              <input id="student-ville" name="ville" className="form-control" value={form.ville} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-birth">Date naissance</label>
              <input id="student-birth" name="date_naissance" className="form-control" type="date" value={form.date_naissance} onChange={handleChange} />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="student-adresse">Adresse</label>
              <input id="student-adresse" name="adresse" className="form-control" value={form.adresse} onChange={handleChange} />
            </div>
            <div className="form-actions">
              <button className="btn btn-primary" type="submit" disabled={loading}>
                {editingId ? 'Enregistrer' : "Ajouter l'etudiant"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel admin-crud-panel panel-spaced">
          <div className="panel-header">
            <h2 className="panel-title">Liste des etudiants</h2>
            <span className="badge badge-primary">{etudiants.length} dossier(s)</span>
          </div>
          <div className="table-wrap">
            <table className="data-table admin-table">
              <thead>
                <tr>
                  <th>Etudiant</th>
                  <th>Matricule</th>
                  <th>Groupe</th>
                  <th>Filiere</th>
                  <th>Niveau</th>
                  <th>Contact</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="7" className="empty-state">Chargement...</td></tr>
                ) : etudiants.length === 0 ? (
                  <tr><td colSpan="7" className="empty-state">Aucun etudiant trouve</td></tr>
                ) : etudiants.map((etudiant) => (
                  <tr key={etudiant.id}>
                    <td>
                      <span className="admin-list-title">
                        <strong>{studentName(etudiant)}</strong>
                        <span className="cell-muted">{etudiant.email || etudiant.username || '-'}</span>
                      </span>
                    </td>
                    <td>{etudiant.matricule || '-'}</td>
                    <td><span className="badge badge-primary">{etudiant.groupe_code || 'Sans groupe'}</span></td>
                    <td>{etudiant.filiere_code || '-'}</td>
                    <td>{etudiant.niveau || '-'}</td>
                    <td>{etudiant.telephone || '-'}</td>
                    <td>
                      <div className="table-actions">
                        <button className="btn btn-soft" type="button" onClick={() => startEdit(etudiant)}>Modifier</button>
                        <button className="btn btn-warning" type="button" onClick={() => deleteEtudiant(etudiant)}>Supprimer</button>
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

export default GestionEtudiants;
