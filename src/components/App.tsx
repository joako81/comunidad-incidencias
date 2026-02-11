import React, { useEffect, useState } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Auth from "./components/Auth";
import Layout from "./components/Layout";
import Dashboard from "./components/Dashboard";
import IncidentForm from "./components/IncidentForm";
import { User, Incident } from "./types";
import { dbGetSession } from "./services/db";

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingIncident, setEditingIncident] = useState<Incident | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserManagement, setShowUserManagement] = useState(false);

  useEffect(() => {
    const initSession = async () => {
      const sessionUser = await dbGetSession();
      setUser(sessionUser);
      setLoading(false);
    };
    initSession();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
  };

  const handleLogout = () => {
    setUser(null);
    setShowUserManagement(false);
  };

  const handleCreateSuccess = () => {
    setShowModal(false);
    setEditingIncident(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleOpenEdit = (incident: Incident) => {
    setEditingIncident(incident);
    setShowModal(true);
  };

  const handleOpenNew = () => {
    setEditingIncident(null);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background text-wood">
        Cargando aplicación...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={!user ? <Auth onLogin={handleLogin} /> : <Navigate to="/" />}
        />
        <Route
          path="/"
          element={
            user ? (
              <Layout
                user={user}
                onLogout={handleLogout}
                onNewIncident={handleOpenNew}
                onToggleUserView={() =>
                  setShowUserManagement(!showUserManagement)
                }
                showUserView={showUserManagement}
              >
                <Dashboard
                  user={user}
                  refreshTrigger={refreshTrigger}
                  showUserManagement={showUserManagement}
                  onCloseUserManagement={() => setShowUserManagement(false)}
                  onEditIncident={handleOpenEdit}
                />
                {showModal && (
                  <IncidentForm
                    onClose={() => {
                      setShowModal(false);
                      setEditingIncident(null);
                    }}
                    onSuccess={handleCreateSuccess}
                    userId={user.id}
                    // AQUI PASAMOS LOS DATOS DEL USUARIO PARA QUE NO SALGA ANÓNIMO
                    userName={user.full_name || user.username}
                    userHouse={user.house_number || ""}
                    userRole={user.role}
                    editingIncident={editingIncident}
                  />
                )}
              </Layout>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
