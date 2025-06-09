import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, Timestamp, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Plus, Heart, Droplet, Calendar, Pill, Trash2, Edit, Save, X, Download, LogOut, FileText, Printer, AlertTriangle } from 'lucide-react';

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

const formatChartDate = (date) => {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

// --- CSV Export Helper ---
const convertToCSV = (data, headers) => {
    const headerRow = headers.map(h => h.label).join(',');
    const rows = data.map(row => {
        return headers.map(header => {
            let value = row[header.key];
            if (value instanceof Timestamp) {
                value = formatDate(value);
            }
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
    });
    return [headerRow, ...rows].join('\n');
};

const downloadCSV = (csvString, filename) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [activeTab, setActiveTab] = useState('dashboard');
    
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
        return <div className="flex justify-center items-center h-screen bg-gray-50"><div className="text-xl font-semibold text-gray-500">Loading Health Tracker...</div></div>;
    }

    return (
        <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
            {user ? (
                <div className="container mx-auto p-4 md:p-8">
                    <Header user={user} handleSignOut={handleSignOut} />
                    <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
                    <main className="mt-6">
                        <ContentRouter activeTab={activeTab} userId={user.uid} setActiveTab={setActiveTab} />
                    </main>
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
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 to-purple-100 p-4">
            <div className="text-center p-8 bg-white/70 backdrop-blur-xl rounded-2xl shadow-xl max-w-md w-full">
                 <h1 className="text-4xl md:text-5xl font-bold text-blue-600">Health Tracker</h1>
                <p className="text-md md:text-lg text-gray-600 mt-2 mb-8">Your personal health monitoring dashboard.</p>
                <button 
                    onClick={onSignIn} 
                    className="flex items-center justify-center gap-3 bg-white py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 w-full"
                >
                    <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google logo" className="w-6 h-6" />
                    <span className="text-gray-700 font-semibold">Sign in with Google</span>
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
        case 'export':
            return <ExportData userId={userId} />;
        case 'preview':
            return <Preview userId={userId} />;
        default:
            return <Dashboard userId={userId} setActiveTab={setActiveTab} />;
    }
}


// --- Components ---

function Header({ user, handleSignOut }) {
    return (
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b-2 border-blue-100 print:hidden">
            <div className="text-center md:text-left">
                <h1 className="text-3xl md:text-4xl font-bold text-blue-600">Health Tracker</h1>
                <p className="text-md md:text-lg text-gray-500 mt-1">Your personal health dashboard.</p>
            </div>
             <div className="flex items-center gap-3 mt-4 md:mt-0">
                <div className="text-right hidden sm:block">
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                </div>
                <img src={user.photoURL} alt="User profile" className="w-12 h-12 rounded-full border-2 border-blue-200" />
                <button onClick={handleSignOut} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Sign Out">
                    <LogOut />
                </button>
            </div>
        </header>
    );
}

function Navigation({ activeTab, setActiveTab }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'blood_pressure', label: 'Blood Pressure' },
        { id: 'blood_sugar', label: 'Blood Sugar' },
        { id: 'appointments', label: 'Appointments' },
        { id: 'medications', label: 'Medications' },
        { id: 'export', label: 'Export Data' },
        { id: 'preview', label: 'Preview' },
    ];

    return (
        <nav className="bg-white rounded-xl shadow-md p-2 print:hidden">
            <ul className="flex flex-wrap justify-center gap-2">
                {navItems.map(item => (
                    <li key={item.id}>
                        <button
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full sm:w-auto px-3 py-2 text-sm md:text-base font-semibold rounded-lg transition-colors duration-200 ${
                                activeTab === item.id 
                                ? 'bg-blue-600 text-white shadow-lg' 
                                : 'text-gray-600 hover:bg-blue-100 hover:text-blue-700'
                            }`}
                        >
                            {item.label}
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
}

function Dashboard({ userId, setActiveTab }) {
    const [bpData, setBpData] = useState([]);
    const [sugarData, setSugarData] = useState([]);
    const [appointments, setAppointments] = useState([]);

    useEffect(() => {
        if (!userId) return;

        const metricsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), orderBy('timestamp', 'desc'));
        const appointmentsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/appointments`), orderBy('date', 'asc'));

        const unsubscribeMetrics = onSnapshot(metricsQuery, snapshot => {
            const metrics = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setBpData(metrics.filter(m => m.type === 'blood_pressure'));
            setSugarData(metrics.filter(m => m.type === 'blood_sugar'));
        });

        const unsubscribeAppointments = onSnapshot(appointmentsQuery, snapshot => {
            const now = new Date();
            const futureAppointments = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(a => a.date && a.date.toDate() >= now);
            setAppointments(futureAppointments);
        });

        return () => {
            unsubscribeMetrics();
            unsubscribeAppointments();
        };
    }, [userId]);
    
    const latestBp = bpData.length > 0 ? bpData[0] : null;
    const latestSugar = sugarData.length > 0 ? sugarData[0] : null;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2">
                <SummaryCard
                    icon={<Heart className="text-red-500" size={32} />}
                    title="Latest Blood Pressure"
                    value={latestBp ? `${latestBp.systolic} / ${latestBp.diastolic}` : 'N/A'}
                    unit="mmHg"
                    timestamp={latestBp?.timestamp}
                    onClick={() => setActiveTab('blood_pressure')}
                />
            </div>
            <div>
                <SummaryCard
                    icon={<Droplet className="text-blue-500" size={32} />}
                    title="Latest Blood Sugar"
                    value={latestSugar?.level || 'N/A'}
                    unit="mg/dL"
                    timestamp={latestSugar?.timestamp}
                    onClick={() => setActiveTab('blood_sugar')}
                />
            </div>
            <div className="md:col-span-2 lg:col-span-3 bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
                <h3 className="text-xl font-bold text-gray-700 flex items-center gap-2 mb-4"><Calendar className="text-purple-500"/>Upcoming Appointments</h3>
                {appointments.length > 0 ? (
                    <ul className="space-y-3">
                        {appointments.slice(0, 3).map(app => (
                            <li key={app.id} className="p-3 bg-gray-50 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center">
                                <div className="mb-2 sm:mb-0">
                                    <p className="font-semibold">{app.doctorName}</p>
                                    <p className="text-sm text-gray-500">{app.specialty}</p>
                                </div>
                                <p className="font-semibold text-purple-600 text-sm sm:text-base">{formatDate(app.date)}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500">No upcoming appointments.</p>
                )}
                 <button onClick={() => setActiveTab('appointments')} className="mt-4 text-blue-600 font-semibold hover:underline">View All Appointments &rarr;</button>
            </div>
        </div>
    );
}

function SummaryCard({ icon, title, value, unit, timestamp, onClick }) {
    return (
        <div onClick={onClick} className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow cursor-pointer h-full flex flex-col justify-between">
            <div>
                <div className="flex items-start justify-between">
                    <h3 className="text-lg md:text-xl font-bold text-gray-700">{title}</h3>
                    {icon}
                </div>
                <p className="text-4xl md:text-5xl font-bold text-blue-600 mt-4">{value}</p>
                <p className="text-md md:text-lg text-gray-500">{unit}</p>
            </div>
            <p className="text-xs md:text-sm text-gray-400 mt-4">Last updated: {formatDate(timestamp)}</p>
        </div>
    );
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
        <div className="space-y-6">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Reading"
                    message="Are you sure you want to delete this health reading? This action cannot be undone."
                    onConfirm={() => handleDeleteMetric(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h2 className="text-xl md:text-2xl font-bold text-gray-700 flex items-center gap-3">{icon} {title} Tracker</h2>
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

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h3 className="text-lg md:text-xl font-bold text-gray-700 mb-4">{title} Trends</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -15, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" fontSize={12} />
                            <YAxis fontSize={12} />
                            <Tooltip content={<CustomTooltip unit={unit} type={type} />} />
                            <Legend />
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

            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
                <h3 className="text-lg md:text-xl font-bold text-gray-700 mb-4">History</h3>
                {/* Mobile View */}
                <div className="md:hidden space-y-3">
                    {data.slice().reverse().map(d => (
                         <div key={d.id} className="bg-gray-50 p-3 rounded-lg border-l-4 border-blue-400">
                            <div className="flex justify-between items-start">
                                <div>
                                    {type === 'blood_pressure' ? (
                                        <p className="font-bold text-lg">{d.systolic} / {d.diastolic} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
                                    ) : (
                                        <p className="font-bold text-lg">{d.level} <span className="text-sm font-normal text-gray-500">{unit}</span></p>
                                    )}
                                    <p className="text-xs text-gray-500">{formatDate(d.timestamp)}</p>
                                </div>
                                <button onClick={() => setConfirmDelete(d.id)} className="p-2 text-gray-400 hover:text-red-600">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                            {d.notes && <p className="text-sm text-gray-600 mt-2 pt-2 border-t border-gray-200 italic">"{d.notes}"</p>}
                        </div>
                    ))}
                </div>
                 {/* Desktop View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-200">
                                <th className="p-3 text-sm font-semibold tracking-wide">Date</th>
                                {type === 'blood_pressure' ? (
                                    <>
                                        <th className="p-3 text-sm font-semibold tracking-wide">Systolic</th>
                                        <th className="p-3 text-sm font-semibold tracking-wide">Diastolic</th>
                                    </>
                                ) : (
                                    <th className="p-3 text-sm font-semibold tracking-wide">Level</th>
                                )}
                                <th className="p-3 text-sm font-semibold tracking-wide">Notes</th>
                                <th className="p-3 text-sm font-semibold tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.slice().reverse().map(d => (
                                <tr key={d.id} className="border-b border-gray-100 hover:bg-gray-50">
                                    <td className="p-3 text-sm text-gray-600">{formatDate(d.timestamp)}</td>
                                    {type === 'blood_pressure' ? (
                                        <>
                                            <td className="p-3 font-medium">{d.systolic}</td>
                                            <td className="p-3 font-medium">{d.diastolic}</td>
                                        </>
                                    ) : (
                                        <td className="p-3 font-medium">{d.level}</td>
                                    )}
                                    <td className="p-3 text-sm text-gray-500 italic">{d.notes || '-'}</td>
                                    <td className="p-3">
                                        <button onClick={() => setConfirmDelete(d.id)} className="text-red-500 hover:text-red-700">
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 {data.length === 0 && <p className="text-center text-gray-500 py-8">No readings recorded yet.</p>}
            </div>
        </div>
    );
}


function Input({ label, ...props }) {
    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-600 mb-1">{label}</label>
            <input {...props} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" />
        </div>
    );
}

function CustomTooltip({ active, payload, label, unit, type }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-bold text-gray-700">{label}</p>
        {type === 'blood_pressure' ? (
             <>
                <p style={{ color: '#ef4444' }}>{`Systolic: ${data.systolic} ${unit}`}</p>
                <p style={{ color: '#3b82f6' }}>{`Diastolic: ${data.diastolic} ${unit}`}</p>
             </>
        ) : (
            <p style={{ color: '#10b981' }}>{`Level: ${data.level} ${unit}`}</p>
        )}
         {data.notes && <p className="text-sm text-gray-500 italic mt-1">{`Notes: ${data.notes}`}</p>}
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
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Appointment"
                    message="Are you sure you want to delete this appointment?"
                    onConfirm={() => handleDeleteAppointment(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-gray-700 flex items-center gap-3 mb-3 sm:mb-0"><Calendar className="text-purple-500"/>Appointments</h2>
                <button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} /> Add New
                </button>
            </div>

            <div className="space-y-4">
                 {appointments.length > 0 ? appointments.map(app => (
                    <AppointmentCard key={app.id} appointment={app} onDelete={() => setConfirmDelete(app.id)}/>
                )) : <p className="text-center text-gray-500 py-8">No appointments scheduled.</p>}
            </div>

            {isModalOpen && <AppointmentModal onClose={() => setIsModalOpen(false)} onSave={handleAddAppointment} />}
        </div>
    );
}

function AppointmentCard({ appointment, onDelete }) {
    const { id, doctorName, specialty, date, notes } = appointment;
    
    const generateGoogleCalendarUrl = () => {
        const title = encodeURIComponent(`Appointment with Dr. ${doctorName}`);
        const details = encodeURIComponent(`Specialty: ${specialty}\nNotes: ${notes || ''}`);
        const eventDate = date.toDate();
        const startTime = eventDate.toISOString().replace(/-|:|\.\d+/g, '');
        const endTime = new Date(eventDate.getTime() + 60 * 60 * 1000).toISOString().replace(/-|:|\.\d+/g, '');

        return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startTime}/${endTime}&details=${details}`;
    };

    const isPast = date.toDate() < new Date();

    return (
        <div className={`p-4 rounded-lg border-l-4 ${isPast ? 'bg-gray-100 border-gray-400' : 'bg-purple-50 border-purple-500'}`}>
            <div className="flex justify-between items-start">
                <div>
                    <p className={`font-bold text-lg ${isPast ? 'text-gray-600' : 'text-purple-800'}`}>{doctorName}</p>
                    <p className={`text-sm ${isPast ? 'text-gray-500' : 'text-purple-600'}`}>{specialty}</p>
                    <p className={`mt-2 font-semibold ${isPast ? 'text-gray-500' : 'text-black'}`}>{formatDate(date)}</p>
                    {notes && <p className="text-sm text-gray-600 mt-2 italic">Notes: {notes}</p>}
                </div>
                <div className="flex flex-col items-end gap-2">
                     <button onClick={onDelete} className="text-gray-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 size={18} />
                    </button>
                    {!isPast && (
                        <a href={generateGoogleCalendarUrl()} target="_blank" rel="noopener noreferrer" 
                           className="text-sm bg-white border border-gray-300 text-gray-700 font-semibold py-1 px-3 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-1.5">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a5/Google_Calendar_icon_%282020%29.svg" alt="Google Calendar" className="w-4 h-4" />
                           Add to Calendar
                        </a>
                    )}
                </div>
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
                     <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
                     <textarea value={notes} onChange={e => setNotes(e.target.value)} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow" rows="3"></textarea>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 font-bold py-2 px-4 rounded-lg hover:bg-gray-300">Cancel</button>
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
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg">
            {confirmDelete && (
                <ConfirmationModal
                    title="Delete Medication"
                    message="Are you sure you want to delete this medication?"
                    onConfirm={() => handleDeleteMed(confirmDelete)}
                    onCancel={() => setConfirmDelete(null)}
                />
            )}
            <h2 className="text-xl md:text-2xl font-bold text-gray-700 flex items-center gap-3 mb-4"><Pill className="text-green-500"/>Medication List</h2>
            <form onSubmit={handleAddMed} className="flex flex-col sm:flex-row gap-3 mb-6 items-end">
                <Input label="Medication Name" value={newMedName} onChange={e => setNewMedName(e.target.value)} placeholder="e.g., Metformin" required/>
                <Input label="Dosage" value={newMedDosage} onChange={e => setNewMedDosage(e.target.value)} placeholder="e.g., 500mg, twice a day"/>
                <button type="submit" className="w-full sm:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                    <Plus size={20} /> Add
                </button>
            </form>

            <div className="space-y-3">
                {medications.length > 0 ? medications.map(med => (
                    <div key={med.id} className="bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                         {editingId === med.id ? (
                            <div className="flex-grow flex gap-2 items-center">
                               <input value={editingName} onChange={(e) => setEditingName(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                               <input value={editingDosage} onChange={(e) => setEditingDosage(e.target.value)} className="w-full p-2 border border-gray-300 rounded-lg"/>
                            </div>
                        ) : (
                            <div className="flex-grow">
                                <p className="font-semibold text-gray-800">{med.name}</p>
                                <p className="text-sm text-gray-500">{med.dosage}</p>
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
                )) : <p className="text-center text-gray-500 py-8">No medications listed.</p>}
            </div>
        </div>
    );
}

function ExportData({ userId }) {
    const [isLoading, setIsLoading] = useState(false);

    const handleExport = async (collectionName, headers, filename) => {
        if (!userId) return;
        setIsLoading(true);

        try {
            const q = query(collection(db, `artifacts/${appId}/users/${userId}/${collectionName}`), orderBy(headers[0].sortKey || 'timestamp', 'desc'));
            const querySnapshot = await getDocs(q);
            const data = querySnapshot.docs.map(doc => doc.data());

            let filteredData = data;
            if (filename.includes('blood-pressure')) {
                filteredData = data.filter(d => d.type === 'blood_pressure');
            } else if (filename.includes('blood-sugar')) {
                filteredData = data.filter(d => d.type === 'blood_sugar');
            }
            
            if (filteredData.length === 0) {
                alert(`No data available to export for ${filename.replace('.csv', '').replace(/-/g, ' ')}.`);
                setIsLoading(false);
                return;
            }

            const csvString = convertToCSV(filteredData, headers);
            downloadCSV(csvString, filename);

        } catch (error) {
            console.error(`Error exporting ${collectionName}:`, error);
            alert(`Failed to export data. Please try again.`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold text-gray-700 flex items-center gap-3 mb-4">
                <Download className="text-indigo-500"/>Export Your Data
            </h2>
            <p className="text-gray-600 mb-6">
                Download your health data as CSV files. You can open these files with Google Sheets, Microsoft Excel, or other spreadsheet programs.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                <ExportButton
                    label="Blood Pressure"
                    isLoading={isLoading}
                    onClick={() => handleExport(
                        'health_metrics',
                        [
                            { key: 'timestamp', label: 'Timestamp' },
                            { key: 'systolic', label: 'Systolic (mmHg)' },
                            { key: 'diastolic', label: 'Diastolic (mmHg)' },
                            { key: 'notes', label: 'Notes' }
                        ],
                        'blood-pressure-data.csv'
                    )}
                />
                <ExportButton
                    label="Blood Sugar"
                    isLoading={isLoading}
                    onClick={() => handleExport(
                        'health_metrics',
                        [
                            { key: 'timestamp', label: 'Timestamp' },
                            { key: 'level', label: 'Level (mg/dL)' },
                            { key: 'notes', label: 'Notes' }
                        ],
                        'blood-sugar-data.csv'
                    )}
                />
                <ExportButton
                    label="Appointments"
                    isLoading={isLoading}
                    onClick={() => handleExport(
                        'appointments',
                        [
                            { key: 'date', label: 'Date', sortKey: 'date' },
                            { key: 'doctorName', label: 'Doctor' },
                            { key: 'specialty', label: 'Specialty' },
                            { key: 'notes', label: 'Notes' }
                        ],
                        'appointments-data.csv'
                    )}
                />
                 <ExportButton
                    label="Medications"
                    isLoading={isLoading}
                    onClick={() => handleExport(
                        'medications',
                        [
                           { key: 'addedAt', label: 'Date Added', sortKey: 'addedAt' },
                           { key: 'name', label: 'Name' },
                           { key: 'dosage', label: 'Dosage' },
                        ],
                        'medications-data.csv'
                    )}
                />
            </div>
        </div>
    );
}

function ExportButton({ label, onClick, isLoading }) {
    return (
         <button 
            onClick={onClick} 
            disabled={isLoading} 
            className="w-full bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:bg-indigo-300 disabled:cursor-not-allowed"
        >
            <Download size={18}/>
            {isLoading ? `Exporting...` : `Export ${label}`}
        </button>
    )
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
                const metricsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/health_metrics`), orderBy('timestamp', 'desc'));
                const metricsSnapshot = await getDocs(metricsQuery);
                const metrics = metricsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setBpData(metrics.filter(m => m.type === 'blood_pressure'));
                setSugarData(metrics.filter(m => m.type === 'blood_sugar'));

                const appointmentsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/appointments`), orderBy('date', 'desc'));
                const appointmentsSnapshot = await getDocs(appointmentsQuery);
                setAppointments(appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

                const medicationsQuery = query(collection(db, `artifacts/${appId}/users/${userId}/medications`), orderBy('name', 'asc'));
                const medicationsSnapshot = await getDocs(medicationsQuery);
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
        return <div className="flex justify-center items-center h-64"><div className="text-xl font-semibold text-gray-500">Loading Report...</div></div>;
    }

    return (
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-8 border-b pb-4 print:hidden">
                <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-3"><FileText/> Health Report</h2>
                <button onClick={handlePrint} className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                    <Printer size={20}/> Print Report
                </button>
            </div>
            
            <div className="space-y-8">
                <ReportSection title="Recent Blood Pressure">
                    {bpData.length > 0 ? bpData.slice(0, 5).map(d => (
                        <div key={d.id} className="grid grid-cols-3 gap-4 py-2 border-b">
                            <span className="text-gray-600">{formatDate(d.timestamp)}</span>
                            <span className="font-semibold">{d.systolic} / {d.diastolic} mmHg</span>
                            <span className="text-gray-500 italic">{d.notes || '-'}</span>
                        </div>
                    )) : <p className="text-gray-500">No data.</p>}
                </ReportSection>

                <ReportSection title="Recent Blood Sugar">
                    {sugarData.length > 0 ? sugarData.slice(0, 5).map(d => (
                        <div key={d.id} className="grid grid-cols-3 gap-4 py-2 border-b">
                            <span className="text-gray-600">{formatDate(d.timestamp)}</span>
                            <span className="font-semibold">{d.level} mg/dL</span>
                            <span className="text-gray-500 italic">{d.notes || '-'}</span>
                        </div>
                    )) : <p className="text-gray-500">No data.</p>}
                </ReportSection>

                <ReportSection title="Appointments">
                     {appointments.length > 0 ? appointments.map(app => (
                        <div key={app.id} className="grid grid-cols-3 gap-4 py-2 border-b">
                            <span className="text-gray-600">{formatDate(app.date)}</span>
                            <span className="font-semibold">{app.doctorName}</span>
                            <span className="text-gray-500">{app.specialty}</span>
                        </div>
                    )) : <p className="text-gray-500">No appointments scheduled.</p>}
                </ReportSection>

                <ReportSection title="Medications">
                    {medications.length > 0 ? medications.map(med => (
                         <div key={med.id} className="grid grid-cols-2 gap-4 py-2 border-b">
                            <span className="font-semibold">{med.name}</span>
                            <span className="text-gray-600">{med.dosage}</span>
                        </div>
                    )) : <p className="text-gray-500">No medications listed.</p>}
                </ReportSection>
            </div>
        </div>
    );
}

const ReportSection = ({ title, children }) => (
    <section>
        <h3 className="text-xl font-bold text-gray-700 mb-3 border-b-2 border-blue-100 pb-2">{title}</h3>
        <div className="text-sm md:text-base">
            {children}
        </div>
    </section>
);


function Footer() {
    return (
        <footer className="text-center mt-12 py-6 border-t border-gray-200 print:hidden">
            <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Health Tracker. Created with care for our loved ones.</p>
        </footer>
    );
}

// --- Reusable Modal Components ---

function Modal({ title, onClose, children }) {
    // Effect to handle 'Escape' key press
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
            onClick={onClose} // Close on backdrop click
        >
            <div 
                className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md"
                onClick={e => e.stopPropagation()} // Prevent click inside modal from closing it
            >
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
                     <div className="bg-red-100 rounded-full p-3">
                        <AlertTriangle className="text-red-600" size={32} />
                    </div>
                </div>
                <p className="text-gray-600 mb-6">{message}</p>
                <div className="flex justify-center gap-4">
                    <button 
                        onClick={onCancel} 
                        className="bg-gray-200 text-gray-800 font-bold py-2 px-6 rounded-lg hover:bg-gray-300"
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
