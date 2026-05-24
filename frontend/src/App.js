import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { HashRouter, Navigate, Routes, Route, useNavigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enseignant from './pages/Enseignant';
import Etudiant from './pages/Etudiant';
import Analyse from './pages/Analyse';
import Graphiques from './pages/Graphiques';
import Profil from './pages/Profil';
import ExportPDF from './pages/ExportPDF';
import Intelligence from './pages/Intelligence';
import DossierEtudiant from './pages/DossierEtudiant';
import GestionEtudiants from './pages/admin/GestionEtudiants';
import GestionProfesseurs from './pages/admin/GestionProfesseurs';
import GestionAbsences from './pages/admin/GestionAbsences';
import GestionNotes from './pages/admin/GestionNotes';
import GestionEmplois from './pages/admin/GestionEmplois';
import GestionUtilisateurs from './pages/admin/GestionUtilisateurs';

const API_URL = 'http://127.0.0.1:8000/api';

const normalizeRole = (role = '') =>
  role
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

function AccessDenied({ role }) {
  const navigate = useNavigate();
  const homePath = role === 'enseignant' ? '/enseignant' : role === 'etudiant' ? '/etudiant' : '/dashboard';

  return (
    <div className="auth-page">
      <section className="auth-card" aria-label="Acces refuse">
        <div className="auth-brand">
          <div className="brand-mark">PA</div>
          <h1 className="auth-title">Acces refuse</h1>
          <p className="auth-subtitle">Votre role ne permet pas d'ouvrir cet espace.</p>
        </div>
        <button className="btn btn-primary btn-full" type="button" onClick={() => navigate(homePath)}>
          Retour a mon espace
        </button>
      </section>
    </div>
  );
}

function ProtectedRoute({ allowedRoles, children }) {
  const [status, setStatus] = useState({ loading: true, role: '' });
  const token = localStorage.getItem('access');

  useEffect(() => {
    if (!token) {
      setStatus({ loading: false, role: '' });
      return;
    }

    axios.get(`${API_URL}/profil/`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((response) => {
      setStatus({ loading: false, role: normalizeRole(response.data.role) });
    }).catch(() => {
      localStorage.clear();
      setStatus({ loading: false, role: '' });
    });
  }, [token]);

  if (!token) return <Navigate to="/" replace />;
  if (status.loading) return <div className="auth-page"><div className="auth-card">Chargement...</div></div>;
  if (!allowedRoles.includes(status.role)) return <AccessDenied role={status.role} />;

  return children;
}

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Dashboard /></ProtectedRoute>} />
        <Route path="/enseignant" element={<ProtectedRoute allowedRoles={['enseignant']}><Enseignant /></ProtectedRoute>} />
        <Route path="/etudiant" element={<ProtectedRoute allowedRoles={['etudiant']}><Etudiant /></ProtectedRoute>} />
        <Route path="/analyse" element={<ProtectedRoute allowedRoles={['admin']}><Analyse /></ProtectedRoute>} />
        <Route path="/graphiques" element={<ProtectedRoute allowedRoles={['admin']}><Graphiques /></ProtectedRoute>} />
        <Route path="/profil" element={<ProtectedRoute allowedRoles={['admin', 'enseignant', 'etudiant']}><Profil /></ProtectedRoute>} />
        <Route path="/export" element={<ProtectedRoute allowedRoles={['admin']}><ExportPDF /></ProtectedRoute>} />
        <Route path="/intelligence" element={<ProtectedRoute allowedRoles={['admin']}><Intelligence /></ProtectedRoute>} />
        <Route path="/dossier-etudiant" element={<ProtectedRoute allowedRoles={['admin']}><DossierEtudiant /></ProtectedRoute>} />
        <Route path="/utilisateurs" element={<ProtectedRoute allowedRoles={['admin']}><GestionUtilisateurs /></ProtectedRoute>} />
        <Route path="/etudiants" element={<ProtectedRoute allowedRoles={['admin']}><GestionEtudiants /></ProtectedRoute>} />
        <Route path="/professeurs" element={<ProtectedRoute allowedRoles={['admin']}><GestionProfesseurs /></ProtectedRoute>} />
        <Route path="/absences" element={<ProtectedRoute allowedRoles={['admin']}><GestionAbsences /></ProtectedRoute>} />
        <Route path="/notes" element={<ProtectedRoute allowedRoles={['admin']}><GestionNotes /></ProtectedRoute>} />
        <Route path="/emplois" element={<ProtectedRoute allowedRoles={['admin']}><GestionEmplois /></ProtectedRoute>} />
      </Routes>
    </HashRouter>
  );
}

export default App;
