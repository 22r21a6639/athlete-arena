import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Label } from "./components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import { Badge } from "./components/ui/badge";
import { Calendar, MapPin, Users, Trophy, Plus, LogOut, User } from "lucide-react";
import { Textarea } from "./components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = React.createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserInfo(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserInfo = async (token) => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (userData) => {
    const response = await axios.post(`${API}/auth/register`, userData);
    localStorage.setItem('token', response.data.token);
    setUser(response.data.user);
    return response.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Landing Page Component
const LandingPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'participant',
    phone: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register(formData);
      }
    } catch (error) {
      setError(error.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-green-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-4 rounded-2xl">
                <Trophy className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-6 font-['Montserrat']">
              Athlete Arena
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto font-['Roboto']">
              The ultimate tournament management platform for athletes and organizers. 
              Register, compete, and track your sporting journey.
            </p>
            
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">1000+</div>
                <div className="text-gray-600">Active Athletes</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">500+</div>
                <div className="text-gray-600">Tournaments Organized</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 mb-2">50+</div>
                <div className="text-gray-600">Sports Categories</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Section */}
      <div className="max-w-md mx-auto px-4 pb-24">
        <Card className="border-0 shadow-xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center font-['Montserrat']">
              {isLogin ? 'Welcome Back' : 'Join Athlete Arena'}
            </CardTitle>
            <CardDescription className="text-center">
              {isLogin ? 'Sign in to your account' : 'Create your account to get started'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">I am a...</Label>
                    <Select value={formData.role} onValueChange={(value) => setFormData({...formData, role: value})}>
                      <SelectTrigger className="h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="participant">Participant (Athlete)</SelectItem>
                        <SelectItem value="organizer">Tournament Organizer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="h-11"
                    />
                  </div>
                </>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="h-11"
                />
              </div>

              {error && (
                <div className="text-red-500 text-sm text-center">{error}</div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
                disabled={loading}
              >
                {loading ? 'Please wait...' : isLogin ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Dashboard Component
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [myTournaments, setMyTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("tournaments");
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTournaments();
    fetchMyTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTournaments(response.data);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMyTournaments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/my-tournaments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMyTournaments(response.data);
    } catch (error) {
      console.error('Error fetching my tournaments:', error);
    }
  };

  const handleRegister = async (tournamentId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/tournaments/${tournamentId}/register`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTournaments();
      fetchMyTournaments();
    } catch (error) {
      alert(error.response?.data?.detail || 'Error registering for tournament');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="bg-gradient-to-r from-blue-600 to-green-600 p-2 rounded-lg">
                <Trophy className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 font-['Montserrat']">Athlete Arena</h1>
                <p className="text-sm text-gray-600">Welcome, {user.name}</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant={user.role === 'organizer' ? 'default' : 'secondary'}>
                {user.role === 'organizer' ? 'Organizer' : 'Participant'}
              </Badge>
              <Button
                onClick={logout}
                variant="outline"
                size="sm"
                className="flex items-center space-x-2"
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 backdrop-blur-sm">
            <TabsTrigger value="tournaments">All Tournaments</TabsTrigger>
            <TabsTrigger value="my-tournaments">
              {user.role === 'organizer' ? 'My Tournaments' : 'Registered Tournaments'}
            </TabsTrigger>
            {user.role === 'organizer' && (
              <TabsTrigger value="create">Create Tournament</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="tournaments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Available Tournaments</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onRegister={handleRegister}
                  userRole={user.role}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="my-tournaments" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">
                {user.role === 'organizer' ? 'My Tournaments' : 'Registered Tournaments'}
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTournaments.map((tournament) => (
                <TournamentCard
                  key={tournament.id}
                  tournament={tournament}
                  onRegister={handleRegister}
                  userRole={user.role}
                  isMyTournament={true}
                />
              ))}
            </div>
          </TabsContent>

          {user.role === 'organizer' && (
            <TabsContent value="create">
              <CreateTournamentForm onSuccess={() => {
                fetchTournaments();
                fetchMyTournaments();
                setActiveTab('my-tournaments');
              }} />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

// Tournament Card Component
const TournamentCard = ({ tournament, onRegister, userRole, isMyTournament = false }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'ongoing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="h-full bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-bold text-gray-900 mb-2">
              {tournament.name}
            </CardTitle>
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={getStatusColor(tournament.status)}>
                {tournament.status}
              </Badge>
              <Badge variant="outline">{tournament.sport}</Badge>
            </div>
          </div>
        </div>
        <CardDescription className="text-sm text-gray-600">
          {tournament.description}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span>{new Date(tournament.start_date).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4 text-green-600" />
            <span>{tournament.location}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Users className="h-4 w-4 text-purple-600" />
            <span>{tournament.participants_count} / {tournament.max_participants} participants</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <User className="h-4 w-4 text-orange-600" />
            <span>Organized by {tournament.organizer_name}</span>
          </div>
        </div>

        {userRole === 'participant' && !isMyTournament && (
          <Button
            onClick={() => onRegister(tournament.id)}
            disabled={tournament.is_registered || tournament.participants_count >= tournament.max_participants}
            className="w-full bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
          >
            {tournament.is_registered ? 'Already Registered' : 
             tournament.participants_count >= tournament.max_participants ? 'Tournament Full' : 'Register'}
          </Button>
        )}
        
        {tournament.is_registered && (
          <Badge className="w-full justify-center bg-green-100 text-green-800">
            ✓ Registered
          </Badge>
        )}
      </CardContent>
    </Card>
  );
};

// Create Tournament Form Component
const CreateTournamentForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    sport: '',
    description: '',
    start_date: '',
    end_date: '',
    location: '',
    max_participants: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/tournaments`, {
        ...formData,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        max_participants: parseInt(formData.max_participants)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      onSuccess();
      setFormData({
        name: '',
        sport: '',
        description: '',
        start_date: '',
        end_date: '',
        location: '',
        max_participants: ''
      });
    } catch (error) {
      setError(error.response?.data?.detail || 'Error creating tournament');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <Card className="max-w-2xl mx-auto bg-white/80 backdrop-blur-sm border-0 shadow-xl">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Create New Tournament</CardTitle>
        <CardDescription className="text-center">
          Fill in the details to create a new tournament
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Tournament Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sport">Sport</Label>
              <Input
                id="sport"
                name="sport"
                value={formData.sport}
                onChange={handleInputChange}
                required
                className="h-11"
                placeholder="e.g., Basketball, Tennis, Football"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
              className="min-h-[100px]"
              placeholder="Describe your tournament..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date & Time</Label>
              <Input
                id="start_date"
                name="start_date"
                type="datetime-local"
                value={formData.start_date}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_date">End Date & Time</Label>
              <Input
                id="end_date"
                name="end_date"
                type="datetime-local"
                value={formData.end_date}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleInputChange}
                required
                className="h-11"
                placeholder="e.g., Central Sports Complex"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_participants">Max Participants</Label>
              <Input
                id="max_participants"
                name="max_participants"
                type="number"
                min="2"
                value={formData.max_participants}
                onChange={handleInputChange}
                required
                className="h-11"
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Tournament'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppContent />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

const AppContent = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
};

export default App;
