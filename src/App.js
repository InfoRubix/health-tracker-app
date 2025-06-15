import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Heart, Droplet, Calendar, Pill, Trash2, Edit, Save, X, LogOut, FileText, Printer, AlertTriangle, LayoutDashboard, Sun, Moon, Sparkles } from 'lucide-react';

// --- Firebase Configuration ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB5wILVXCts3OF9ZQ-dlmRoRfRLBkeIYNg",
  authDomain: "health-tracker-app-772bd.firebaseapp.com",
  projectId: "health-tracker-app-772bd",
  storageBucket: "health-tracker-app-772bd.appspot.com",
  messagingSenderId: "41845772913",
  appId: "1:41845772913:web:fe34d5bee1c2b35cfe41d0",
  measurementId: "G-J03GKV5Z5C"
};
const appId = 'health-tracker-standalone'; // A unique ID for this app's data

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Helper Functions ---
const formatDate = (date, includeTime = true) => {
  if (!date) return 'N/A';
  const d = date.toDate ? date.toDate() : new Date(date);
  if (isNaN(d)) return 'Invalid Date';
  
  const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      ...(includeTime && { hour: '2-digit', minute: '2-digit' })
  };
  return d.toLocaleDateString('en-US', options);
};

const formatTime = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d)) return 'Invalid Date';
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

const formatChartDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);
    
    // --- Authentication Effect ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const handleSignOut = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    if (!isAuthReady) {
        return <div className="flex justify-center items-center h-screen bg-gray-100 dark:bg-gray-900"><div className="text-xl font-semibold text-gray-500 dark:text-gray-400">Loading Health Tracker...</div></div>;
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen font-sans text-gray-800 dark:text-gray-200">
            {user ? (
                <div className="container mx-auto p-4 md:p-6">
                    <Header user={user} handleSignOut={handleSignOut} theme={theme} setTheme={setTheme} />
                    <main className="mt-6">
                        <ContentRouter activeTab={activeTab} userId={user.uid} setActiveTab={setActiveTab} />
                    </main>
                    <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
                    <Footer />
                </div>
            ) : (
                <LoginPage onSignIn={signInWithGoogle} />
            )}
        </div>
    );
}

function LoginPage({ onSignIn }) {
    return (
        <div className="flex flex-col items-center justify-between min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 p-8">
            <div className="text-left w-full max-w-md">
                 <h1 className="text-5xl font-bold text-white">Perfect</h1>
                 <h1 className="text-5xl font-bold text-white mt-2">Healthcare</h1>
                 <h1 className="text-5xl font-bold text-white mt-2">Solution</h1>
            </div>
            <div className="flex justify-center items-center flex-grow">
                 <img src="https://storage.googleapis.com/gemini-prod-us-west1-assets/11b3337b830e20556209867919a9d70c" alt="Doctor illustration" className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"/>
            </div>
            <div className="w-full max-w-md">
                 <button 
                    onClick={onSignIn} 
                    className="w-full bg-white text-blue-600 font-semibold py-4 px-6 rounded-full shadow-lg hover:bg-gray-200 transition-colors"
                >
                    Get Started
                </button>
            </div>
        </div>
    );
}

function ContentRouter({ activeTab, userId, setActiveTab }) {
    switch (activeTab) {
        case 'dashboard':
            return <Dashboard userId={userId} setActiveTab={setActiveTab} />;
        case 'blood_pressure':
            return <HealthMetricTracker userId={userId} type="blood_pressure" />;
        case 'blood_sugar':
            return <HealthMetricTracker userId={userId} type="blood_sugar" />;
        case 'appointments':
            return <Appointments userId={userId} />;
        case 'medications':
             return <Medications userId={userId} />;
        case 'preview':
            return <Preview userId={userId} />;
        default:
            return <Dashboard userId={userId} setActiveTab={setActiveTab} />;
    }
}


// --- Components ---

function Header({ user, handleSignOut, theme, setTheme }) {
    const toggleTheme = () => {
        setTheme(theme === 'light' ? 'dark' : 'light');
    };
    return (
        <header className="flex justify-between items-center mb-6 print:hidden">
             <div className="flex items-center gap-3">
                <img src={user.photoURL} alt="User profile" className="w-12 h-12 rounded-full border-2 border-white dark:border-gray-700" />
                <div>
                     <p className="text-sm text-gray-500 dark:text-gray-400">Good morning</p>
                    <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{user.displayName.split(' ')[0]}</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                 <button onClick={toggleTheme} className="p-2 rounded-full bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors">
                    {theme === 'light' ? <Moon size={20}/> : <Sun size={20}/>}
                </button>
                 <button onClick={handleSignOut} className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 transition-colors" title="Sign Out">
                    <LogOut size={22}/>
                </button>
            </div>
        </header>
    );
}

function Navigation({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'dashboard', label: 'Home', icon: <LayoutDashboard size={24} /> },
        { id: 'preview', label: 'Report', icon: <FileText size={24} /> },
        { id: 'appointments', label: 'Calendar', icon: <Calendar size={24} /> },
        { id: 'medications', label: 'Meds', icon: <Pill size={24} /> },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-[0_-2px_10px_rgba(0,0,0,0.1)] dark:shadow-[0_-2px_10px_rgba(0,0,0,0.4)] print:hidden md:relative md:bg-transparent md:shadow-none md:mt-8">
            <ul className="flex justify-around items-center p-2 md:hidden">
                {navItems.map(item => (
                    <li key={item.id} className="w-full">
                        <button
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex flex-col items-center gap-1 justify-center py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                                activeTab === item.id 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400'
                            }`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
             <div className="hidden md:flex bg-white dark:bg-gray-800 rounded-xl shadow-md p-2 print:hidden justify-center mt-4">
                 <ul className="flex flex-wrap justify-center gap-2">
                    {navItems.map(item => (
                        <li key={item.id}>
                            <button
                                onClick={() => setActiveTab(item.id)}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg transition-colors duration-200 ${
                                    activeTab === item.id 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-700'
                                }`}
                            >
                                {item.icon}
                                <span>{item.label}</span>
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
}

function Dashboard({ userId, setActiveTab }) {
    const [appointments, setAppointments] = useState([]);
    const [bpData, setBpData] = useState([]);
    const [sugarData, setSugarData] = useState([]);

    useEffect(() => {
        if (!userId) return;
        const appointmentsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/appointments`), orderBy('date', 'asc'));
        const unsubscribeAppointments = onSnapshot(appointmentsQuery, snapshot => {
            const now = new Date();
            const futureAppointments = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(a => a.date && a.date.toDate() >= now);
            setAppointments(futureAppointments);
        });
        
        const metricsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), orderBy('timestamp', 'desc'));
        const unsubscribeMetrics = onSnapshot(metricsQuery, snapshot => {
            const metrics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBpData(metrics.filter(m => m.type === 'blood_pressure'));
            setSugarData(metrics.filter(m => m.type === 'blood_sugar'));
        });

        return () => {
            unsubscribeAppointments();
            unsubscribeMetrics();
        }
    }, [userId]);
    
    const upcomingAppointment = appointments.length > 0 ? appointments[0] : null;
    const latestBp = bpData.length > 0 ? bpData[0] : null;
    const latestSugar = sugarData.length > 0 ? sugarData[0] : null;


    return (
        <div className="space-y-8 pb-24 md:pb-0">
            <section>
                 <GeminiAdvice latestBp={latestBp} latestSugar={latestSugar} />
            </section>
            <section>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Upcoming Appointment</h2>
                    <button onClick={() => setActiveTab('appointments')} className="text-sm font-bold text-blue-600 dark:text-blue-400">SEE ALL</button>
                </div>
                {upcomingAppointment ? (
                    <AppointmentCard appointment={upcomingAppointment} />
                ) : (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl text-center text-gray-500 dark:text-gray-400 shadow-sm">No upcoming appointments.</div>
                )}
            </section>
             <section>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Track Your Health</h2>
                </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <HealthCategoryCard title="Blood Pressure" icon={<Heart className="text-red-500"/>} onClick={() => setActiveTab('blood_pressure')} latestReading={latestBp} unit="mmHg" />
                     <HealthCategoryCard title="Blood Sugar" icon={<Droplet className="text-blue-500"/>} onClick={() => setActiveTab('blood_sugar')} latestReading={latestSugar} unit="mg/dL" />
                </div>
            </section>
        </div>
    );
}

function GeminiAdvice({ latestBp, latestSugar }) {
    const [advice, setAdvice] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // --- IMPORTANT: ADD YOUR GEMINI API KEY HERE ---
    // You can get a key from Google AI Studio: https://aistudio.google.com/
    const GEMINI_API_KEY = "AIzaSyA--gCOyJgOHOaYUHsKRTfglW3VyjcvRws"; // <-- PASTE YOUR KEY HERE

    const getAdvice = async () => {
        setIsLoading(true);
        setError('');
        setAdvice('');

        let prompt = "Act as a friendly health assistant. Based on the following latest health readings, provide some general advice, potential causes for these readings, and some healthy living tips. The user is likely an older adult. Format the response in simple markdown with clear headings for each section. ";

        if (latestBp) {
            prompt += `My latest blood pressure reading is ${latestBp.systolic}/${latestBp.diastolic} mmHg. `;
        }
        if (latestSugar) {
            prompt += `My latest blood sugar reading is ${latestSugar.level} mg/dL. `;
        }
        if (!latestBp && !latestSugar) {
            prompt += "I have no data yet, please provide general healthy living tips for seniors."
        }

        try {
            const chatHistory = [{ role: "user", parts: [{ text: prompt }] }];
            const payload = { contents: chatHistory };
            const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                 const errorBody = await response.json();
                 throw new Error(`API request failed with status ${response.status}: ${errorBody.error.message}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates[0]?.content?.parts[0]?.text) {
                const text = result.candidates[0].content.parts[0].text;
                setAdvice(text);
            } else {
                throw new Error("Unexpected response format from the API.");
            }

        } catch (e) {
            console.error("Error fetching advice:", e);
            setError(`Sorry, I couldn't get health advice: ${e.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 dark:from-blue-800 dark:to-purple-900 p-6 rounded-2xl shadow-lg text-white">
            <div className="flex items-start gap-4">
                 <div className="bg-white/20 p-2 rounded-full">
                    <Sparkles className="text-white"/>
                </div>
                <div>
                    <h2 className="text-xl font-bold">AI Health Assistant</h2>
                    <p className="text-sm opacity-80">Get personalized advice based on your latest data.</p>
                </div>
            </div>
           
            {isLoading ? (
                <div className="flex justify-center items-center h-24">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
            ) : advice ? (
                 <div className="prose prose-invert mt-4 text-sm" dangerouslySetInnerHTML={{ __html: advice.replace(/\n/g, '<br />') }} />
            ) : error ? (
                <p className="mt-4 text-red-300 bg-red-900/50 p-3 rounded-lg">{error}</p>
            ) : (
                <>
                    <button 
                        onClick={getAdvice} 
                        className="mt-4 w-full bg-white/90 text-blue-600 font-semibold py-2 px-4 rounded-lg hover:bg-white transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={!GEMINI_API_KEY}
                    >
                        Get Health Advice
                    </button>
                    {!GEMINI_API_KEY && <p className="text-xs text-center mt-2 text-yellow-300">Note: AI Assistant requires an API key to be added to the code.</p>}
                </>
            )}
        </div>
    );
}

function HealthCategoryCard({ title, icon, onClick, latestReading, unit }) {
    const displayValue = () => {
        if (!latestReading) return "N/A";
        if (latestReading.systolic) {
            return `${latestReading.systolic}/${latestReading.diastolic}`;
        }
        return latestReading.level;
    };
    return (
         <div onClick={onClick} className="bg-white dark:bg-gray-800 p-4 rounded-2xl flex flex-col items-start justify-center gap-3 shadow-sm hover:shadow-lg dark:hover:bg-gray-700 transition-shadow cursor-pointer">
            <div className="flex items-center gap-3">
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-full">
                    {icon}
                </div>
                <p className="font-semibold text-gray-700 dark:text-gray-200">{title}</p>
            </div>
            <div className="w-full mt-2">
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{displayValue()} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{unit}</span></p>
                <p className="text-xs text-gray-400 dark:text-gray-500">Last reading: {formatDate(latestReading?.timestamp, false) || 'N/A'}</p>
            </div>
        </div>
    )
}

function HealthMetricTracker({ userId, type }) {
    const [data, setData] = useState([]);
    const [systolic, setSystolic] = useState('');
    const [diastolic, setDiastolic] = useState('');
    const [level, setLevel] = useState('');
    const [notes, setNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const config = useMemo(() => ({
        blood_pressure: {
            title: "Blood Pressure",
            icon: <Heart className="text-red-500" />,
            unit: "mmHg",
        },
        blood_sugar: {
            title: "Blood Sugar",
            icon: <Droplet className="text-blue-500" />,
            unit: "mg/dL",
        }
    }), []);

    const { title, icon, unit } = config[type];
    
    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), orderBy('timestamp', 'asc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const metricData = querySnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(item => item.type === type);
            setData(metricData);
        }, (error) => {
            console.error("Error fetching data: ", error);
        });

        return () => unsubscribe();
    }, [userId, type]);
    
    const handleAddMetric = async (e) => {
        e.preventDefault();
        if (!userId || isLoading) return;
        
        setIsLoading(true);
        let newMetric = {
            type: type,
            timestamp: Timestamp.now(),
            notes: notes,
        };
        
        if (type === 'blood_pressure') {
            if (!systolic || !diastolic || Number(systolic) <= 0 || Number(diastolic) <= 0) {
                 alert("Please enter valid Systolic and Diastolic values.");
                 setIsLoading(false);
                 return;
            }
            newMetric.systolic = Number(systolic);
            newMetric.diastolic = Number(diastolic);
        } else {
            if (!level || Number(level) <= 0) {
                 alert("Please enter a valid blood sugar level.");
                 setIsLoading(false);
                 return;
            }
            newMetric.level = Number(level);
        }
        
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), newMetric);
            setSystolic('');
            setDiastolic('');
            setLevel('');
            setNotes('');
        } catch (error) {
            console.error("Error adding document: ", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteMetric = async (id) => {
        if (!userId) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/health_metrics`, id));
            setConfirmDelete(null);
        } catch (error) {
            console.error("Error deleting document: ", error);
        }
    };

    const chartData = useMemo(() => {
        return data.map(d => ({ ...d, name: formatChartDate(d.timestamp) }));
    }, [data]);


    return (
        <div className="space-y-6 pb-24 md:pb-0">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Reading"
                    message="Are you sure you want to delete this health reading? This action cannot be undone."
                    onConfirm={() => handleDeleteMetric(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">{icon} {title} Tracker</h2>
                <form onSubmit={handleAddMetric} className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
                    {type === 'blood_pressure' ? (
                        <>
                            <Input label="Systolic (SYS)" value={systolic} onChange={e => setSystolic(e.target.value)} placeholder="e.g., 120" type="number" required />
                            <Input label="Diastolic (DIA)" value={diastolic} onChange={e => setDiastolic(e.target.value)} placeholder="e.g., 80" type="number" required />
                        </>
                    ) : (
                        <div className="sm:col-span-2 lg:col-span-1">
                            <Input label={`Level (${unit})`} value={level} onChange={e => setLevel(e.target.value)} placeholder="e.g., 100" type="number" required />
                        </div>
                    )}
                    <div className="sm:col-span-2 lg:col-span-1">
                      <Input label="Notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g., After lunch" />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full justify-center bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:bg-blue-300">
                        <Plus size={20} /> {isLoading ? 'Saving...' : 'Add Reading'}
                    </button>
                </form>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">{title} Trends</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                            <XAxis dataKey="name" fontSize={12} stroke="rgb(156 163 175)"/>
                            <YAxis fontSize={12} stroke="rgb(156 163 175)"/>
                            <Tooltip content={<CustomTooltip unit={unit} type={type} />} />
                            <Legend wrapperStyle={{ color: '#333' }}/>
                            {type === 'blood_pressure' ? (
                                <>
                                    <Line type="monotone" dataKey="systolic" stroke="#ef4444" strokeWidth={2} name="Systolic" />
                                    <Line type="monotone" dataKey="diastolic" stroke="#3b82f6" strokeWidth={2} name="Diastolic" />
                                </>
                            ) : (
                                <Line type="monotone" dataKey="level" stroke="#10b981" strokeWidth={2} name="Level" />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm">
                <h3 className="text-lg md:text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">History</h3>
                <div className="space-y-3">
                    {data.slice().reverse().map(d => (
                         <div key={d.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border-l-4 border-blue-400">
                            <div className="flex justify-between items-start">
                                <div>
                                    {type === 'blood_pressure' ? (
                                        <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{d.systolic} / {d.diastolic} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{unit}</span></p>
                                    ) : (
                                        <p className="font-bold text-lg text-gray-800 dark:text-gray-100">{d.level} <span className="text-sm font-normal text-gray-500 dark:text-gray-400">{unit}</span></p>
                                    )}
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(d.timestamp)}</p>
                                </div>
                                <button onClick={() => setConfirmDelete(d.id)} className="p-2 text-gray-400 hover:text-red-600">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            {d.notes && <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 italic">"{d.notes}"</p>}
                        </div>
                    ))}
                </div>
                 {data.length === 0 && <p className="text-center text-gray-500 dark:text-gray-400 py-8">No readings recorded yet.</p>}
            </div>
        </div>
    );
}


function Input({ label, ...props }) {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">{label}</label>
            <input {...props} className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
        </div>
    );
}

function CustomTooltip({ active, payload, label, unit, type }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white dark:bg-gray-800 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
        <p className="font-bold text-gray-700 dark:text-gray-100">{label}</p>
        {type === 'blood_pressure' ? (
             <>
                <p style={{ color: '#ef4444' }}>{`Systolic: ${data.systolic} ${unit}`}</p>
                <p style={{ color: '#3b82f6' }}>{`Diastolic: ${data.diastolic} ${unit}`}</p>
             </>
        ) : (
            <p style={{ color: '#10b981' }}>{`Level: ${data.level} ${unit}`}</p>
        )}
         {data.notes && <p className="text-sm text-gray-500 dark:text-gray-400 italic mt-1">{`Notes: ${data.notes}`}</p>}
      </div>
    );
  }
  return null;
}


function Appointments({ userId }) {
    const [appointments, setAppointments] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/appointments`), orderBy('date', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Error fetching appointments:", error));

        return () => unsubscribe();
    }, [userId]);

    const handleAddAppointment = async (appointment) => {
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/appointments`), appointment);
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error adding appointment:", error);
        }
    };
    
    const handleDeleteAppointment = async (id) => {
        try {
             await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/appointments`, id));
             setConfirmDelete(null);
        } catch (error) {
            console.error("Error deleting appointment: ", error);
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm pb-24 md:pb-6">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Appointment"
                    message="Are you sure you want to delete this appointment?"
                    onConfirm={() => handleDeleteAppointment(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 mb-3 sm:mb-0"><Calendar className="text-blue-600"/>Appointments</h2>
                <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} /> Add New
                </button>
            </div>

            <div className="space-y-4">
                 {appointments.length > 0 ? appointments.map(app => (
                    <AppointmentCard key={app.id} appointment={app} onDelete={() => setConfirmDelete(app.id)}/>
                )) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">No appointments scheduled.</p>}
            </div>

            {isModalOpen && <AppointmentModal onClose={() => setIsModalOpen(false)} onSave={handleAddAppointment} />}
        </div>
    );
}

function AppointmentCard({ appointment, onDelete }) {
    const { doctorName, specialty, date, notes } = appointment;
    const isPast = date.toDate() < new Date();

    const generateGoogleCalendarUrl = () => {
        const title = encodeURIComponent(`Appointment with Dr. ${doctorName}`);
        const details = encodeURIComponent(`Specialty: ${specialty}\nNotes: ${notes || ''}`);
        const eventDate = date.toDate();
        const startTime = eventDate.toISOString().replace(/-|:|\.\d+/g, '');
        const endTime = new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '');
        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
    };

    return (
        <div className={`p-4 rounded-2xl flex items-center gap-4 ${isPast ? 'bg-gray-100 dark:bg-gray-700' : 'bg-blue-50 dark:bg-blue-900/50'}`}>
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                <Calendar className={`${isPast ? 'text-gray-400' : 'text-blue-600'}`}/>
            </div>
            <div className="flex-grow">
                 <p className={`font-bold text-gray-800 dark:text-gray-100`}>{doctorName}</p>
                 <p className={`text-sm text-gray-500 dark:text-gray-400`}>{specialty}</p>
                 <p className={`mt-1 text-sm font-semibold ${isPast ? 'text-gray-500' : 'text-blue-700 dark:text-blue-400'}`}>{formatDate(date, false)} at {formatTime(date)}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
                {onDelete && (
                    <button onClick={onDelete} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 size={18} />
                    </button>
                )}
                {!isPast && (
                     <a href={generateGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer"
                           className="text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 font-semibold py-1 px-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-3 h-3" />
                           Add to Calendar
                        </a>
                )}
            </div>
        </div>
    );
}


function AppointmentModal({ onClose, onSave }) {
    const [doctorName, setDoctorName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!date || !time) {
            alert("Please select a valid date and time.");
            return;
        }
        const [year, month, day] = date.split('-').map(Number);
        const [hours, minutes] = time.split(':').map(Number);
        const combinedDate = new Date(year, month - 1, day, hours, minutes);

        onSave({
            doctorName,
            specialty,
            date: Timestamp.fromDate(combinedDate),
            notes
        });
    };
    
    return (
       <Modal title="New Appointment" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Doctor's Name" value={doctorName} onChange={e => setDoctorName(e.target.value)} required/>
                <Input label="Specialty" value={specialty} onChange={e => setSpecialty(e.target.value)} required/>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Date" type="date" value={date} onChange={e => setDate(e.target.value)} required/>
                  <Input label="Time" type="time" value={time} onChange={e => setTime(e.target.value)} required/>
                </div>
                <div>
                     <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Notes</label>
                     <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" rows="3"></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700">Save Appointment</button>
                </div>
            </form>
       </Modal>
    );
}

function Medications({ userId }) {
    const [medications, setMedications] = useState([]);
    const [newMedName, setNewMedName] = useState('');
    const [newMedDosage, setNewMedDosage] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [editingDosage, setEditingDosage] = useState('');
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        if (!userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/medications`), orderBy('addedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        }, (error) => console.error("Error fetching medications:", error));
        return () => unsubscribe();
    }, [userId]);

    const handleAddMed = async (e) => {
        e.preventDefault();
        if (!newMedName.trim() || !userId) return;
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/medications`), {
                name: newMedName,
                dosage: newMedDosage,
                addedAt: Timestamp.now()
            });
            setNewMedName('');
            setNewMedDosage('');
        } catch (error) {
            console.error("Error adding medication:", error);
        }
    };

    const handleDeleteMed = async (id) => {
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/medications`, id));
            setConfirmDelete(null);
        } catch (error) {
            console.error("Error deleting medication:", error);
        }
    };

    const handleUpdateMed = async (id) => {
        try {
            const medDocRef = doc(db, `artifacts/${appId}/users/${userId}/medications`, id);
            await updateDoc(medDocRef, {
                name: editingName,
                dosage: editingDosage
            });
            setEditingId(null);
            setEditingName('');
            setEditingDosage('');
        } catch (error) {
            console.error("Error updating medication:", error);
        }
    };
    
    const startEditing = (med) => {
        setEditingId(med.id);
        setEditingName(med.name);
        setEditingDosage(med.dosage);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-2xl shadow-sm pb-24 md:pb-6">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Medication"
                    message="Are you sure you want to delete this medication?"
                    onConfirm={() => handleDeleteMed(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3 mb-4"><Pill className="text-green-500"/>Medication List</h2>
            <form onSubmit={handleAddMed} className="flex flex-col sm:flex-row gap-3 mb-6 items-end">
                <Input label="Medication Name" value={newMedName} onChange={e => setNewMedName(e.target.value)} placeholder="e.g., Metformin" required/>
                <Input label="Dosage" value={newMedDosage} onChange={e => setNewMedDosage(e.target.value)} placeholder="e.g., 500mg, twice a day"/>
                <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} /> Add
                </button>
            </form>

            <div className="space-y-3">
                {medications.length > 0 ? medications.map(med => (
                    <div key={med.id} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                         {editingId === med.id ? (
                            <div className="flex-grow flex gap-2 items-center">
                               <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"/>
                               <input value={editingDosage} onChange={(e) => setEditingDosage(e.target.value)} className="w-full p-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 rounded-lg"/>
                            </div>
                        ) : (
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800 dark:text-gray-100">{med.name}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{med.dosage}</p>
                            </div>
                        )}
                        <div className="flex gap-2 ml-4">
                             {editingId === med.id ? (
                                <>
                                    <button onClick={() => handleUpdateMed(med.id)} className="p-2 text-green-600 hover:text-green-800"><Save size={18}/></button>
                                    <button onClick={() => setEditingId(null)} className="p-2 text-gray-500 hover:text-gray-700"><X size={18}/></button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => startEditing(med)} className="p-2 text-blue-600 hover:text-blue-800"><Edit size={18}/></button>
                                    <button onClick={() => setConfirmDelete(med.id)} className="p-2 text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                                </>
                            )}
                        </div>
                    </div>
                )) : <p className="text-center text-gray-500 dark:text-gray-400 py-8">No medications listed.</p>}
            </div>
        </div>
    );
}

function Preview({ userId }) {
    const [bpData, setBpData] = useState([]);
    const [sugarData, setSugarData] = useState([]);
    const [appointments, setAppointments] = useState([]);
    const [medications, setMedications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch all data in parallel for better performance
                const metricsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), orderBy('timestamp', 'desc'));
                const appointmentsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/appointments`), orderBy('date', 'desc'));
                const medicationsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/medications`), orderBy('name', 'asc'));

                const [metricsSnapshot, appointmentsSnapshot, medicationsSnapshot] = await Promise.all([
                    getDocs(metricsQuery),
                    getDocs(appointmentsQuery),
                    getDocs(medicationsQuery)
                ]);

                const metrics = metricsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBpData(metrics.filter(m => m.type === 'blood_pressure'));
                setSugarData(metrics.filter(m => m.type === 'blood_sugar'));
                setAppointments(appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
                setMedications(medicationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

            } catch (error) {
                console.error("Error fetching preview data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId]);

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64"><div className="text-xl font-semibold text-gray-500 dark:text-gray-400">Loading Report...</div></div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-2xl shadow-sm pb-24 md:pb-6">
            <div className="flex justify-between items-center mb-8 border-b dark:border-gray-700 pb-4 print:hidden">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3"><FileText/> Health Report</h2>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    <Printer size={20}/> Print Report
                </button>
            </div>
            
            <div className="space-y-8">
                <ReportSection title="Recent Blood Pressure">
                    {bpData.length > 0 ? bpData.slice(0, 5).map(d => (
                        <div key={d.id} className="grid grid-cols-2 md:grid-cols-3 gap-4 py-2 border-b dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">{formatDate(d.timestamp)}</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{d.systolic} / {d.diastolic} mmHg</span>
                            <span className="text-gray-500 dark:text-gray-400 italic hidden md:block">{d.notes || '-'}</span>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400">No data.</p>}
                </ReportSection>

                <ReportSection title="Recent Blood Sugar">
                    {sugarData.length > 0 ? sugarData.slice(0, 5).map(d => (
                        <div key={d.id} className="grid grid-cols-2 md:grid-cols-3 gap-4 py-2 border-b dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">{formatDate(d.timestamp)}</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{d.level} mg/dL</span>
                            <span className="text-gray-500 dark:text-gray-400 italic hidden md:block">{d.notes || '-'}</span>
                        </div>
                    )) : <p className="text-gray-500 dark:text-gray-400">No data.</p>}
                </ReportSection>

                <ReportSection title="Appointments">
                     {appointments.length > 0 ? appointments.map(app => (
                        <div key={app.id} className="grid grid-cols-2 md:grid-cols-3 gap-4 py-2 border-b dark:border-gray-700">
                            <span className="text-gray-600 dark:text-gray-400">{formatDate(app.date)}</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{app.doctorName}</span>
                            <span className="text-gray-500 dark:text-gray-400 hidden md:block">{app.specialty}</span>
                        </div>
                    )) : <p className="text-center text-gray-500 dark:text-gray-400">No appointments scheduled.</p>}
                </ReportSection>

                <ReportSection title="Medications">
                    {medications.length > 0 ? medications.map(med => (
                         <div key={med.id} className="grid grid-cols-2 gap-4 py-2 border-b dark:border-gray-700">
                            <span className="font-semibold text-gray-800 dark:text-gray-100">{med.name}</span>
                            <span className="text-gray-600 dark:text-gray-400">{med.dosage}</span>
                        </div>
                    )) : <p className="text-center text-gray-500 dark:text-gray-400">No medications listed.</p>}
                </ReportSection>
            </div>
        </div>
    );
}

const ReportSection = ({ title, children }) => (
    <section>
        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 mb-3 border-b-2 border-blue-100 dark:border-blue-800 pb-2">{title}</h3>
        <div className="text-sm md:text-base">
            {children}
        </div>
    </section>
);


function Footer() {
    return (
        <footer className="text-center mt-24 pb-8 md:mt-12 md:pb-6 border-t border-gray-200 dark:border-gray-800 pt-6 print:hidden">
            <p className="text-sm text-gray-500 dark:text-gray-400">&copy; {new Date().getFullYear()} Health Tracker. Created with care for our loved ones.</p>
        </footer>
    );
}

// --- Reusable Modal Components ---

function Modal({ title, onClose, children }) {
    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4"
            onClick={onClose} 
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()} 
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-300">
                        <X size={24} />
                    </button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
}

function ConfirmationModal({ title, message, onConfirm, onCancel }) {
    return (
        <Modal title={title} onClose={onCancel}>
            <div className="text-center">
                <div className="flex justify-center mb-4">
                     <div className="bg-red-100 dark:bg-red-900/50 rounded-full p-3">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={onCancel} 
                        className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-100 dark:hover:bg-gray-500"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onConfirm}
                        className="bg-red-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-red-700"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </Modal>
    );
}
