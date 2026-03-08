import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

export type UserType = 'citizen' | 'authority' | null;
export type AdminRole = 'super_admin' | 'local_admin';

export interface User {
    name?: string;
    email?: string;
    mobile?: string;
    role: UserType;
    adminRole?: AdminRole;
    district_id?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    loginCitizen: (mobile: string) => Promise<boolean>;
    logout: () => void;
    isLoading: boolean;
    activeDistrict: string;
    setActiveDistrict: (districtId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'floodwatch_user';
const DISTRICT_KEY = 'floodwatch_active_district';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        try {
            const stored = sessionStorage.getItem(SESSION_KEY);
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [activeDistrict, setActiveDistrictRaw] = useState<string>(() => {
        return sessionStorage.getItem(DISTRICT_KEY) || 'jaipur_01';
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                const email = firebaseUser.email || '';
                const newAuthUser: User = {
                    name: firebaseUser.displayName || email.split('@')[0] || 'Commander',
                    email: email,
                    role: 'authority',
                    adminRole: (email.includes('super') || email === 'ashmit@equinox.app') ? 'super_admin' : 'local_admin',
                    district_id: 'jaipur_01',
                };
                setUser(newAuthUser);
                sessionStorage.setItem(SESSION_KEY, JSON.stringify(newAuthUser));
            } else {
                setUser((prev) => {
                    if (prev?.role === 'citizen') return prev;
                    sessionStorage.removeItem(SESSION_KEY);
                    return null;
                });
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        sessionStorage.setItem(DISTRICT_KEY, activeDistrict);
    }, [activeDistrict]);

    const setActiveDistrict = (districtId: string) => {
        if (user?.adminRole === 'super_admin') {
            setActiveDistrictRaw(districtId);
        }
    };

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setIsLoading(false);
            return { success: true };
        } catch (err: any) {
            console.error('FIREBASE LOGIN FAILED:', err);
            setIsLoading(false);
            return { success: false, error: err.message || 'Access Denied: Invalid credentials' };
        }
    };

    const loginCitizen = async (mobile: string): Promise<boolean> => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        const citizenUser: User = {
            mobile,
            role: 'citizen',
            adminRole: 'local_admin',
            district_id: 'jaipur_01',
        };
        setUser(citizenUser);
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(citizenUser));
        setActiveDistrictRaw('jaipur_01');
        setIsLoading(false);
        return true;
    };

    const logout = async () => {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(DISTRICT_KEY);
        if (auth.currentUser) {
            await signOut(auth);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loginCitizen, isLoading, activeDistrict, setActiveDistrict }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
