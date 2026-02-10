import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Auth from './src/components/Auth';
import Layout from './src/components/Layout';
import Dashboard from './src/components/Dashboard';
import IncidentForm from './src/components/IncidentForm';
import { User } from './src/types';
import { dbGetSession } from './src/services/db';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-background text-wood">Cargando aplicación...</div>;
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
                onNewIncident={() => setShowModal(true)}
                onToggleUserView={() => setShowUserManagement(!showUserManagement)}
                showUserView={showUserManagement}
              >
                <Dashboard 
                    user={user} 
                    refreshTrigger={refreshTrigger} 
                    showUserManagement={showUserManagement}
                    onCloseUserManagement={() => setShowUserManagement(false)}
                />
                {showModal && (
                  <IncidentForm 
                    onClose={() => setShowModal(false)} 
                    onSuccess={handleCreateSuccess}
                    userId={user.id}
                    userRole={user.role}
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