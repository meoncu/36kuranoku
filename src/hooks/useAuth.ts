import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, getDoc, onSnapshot } from 'firebase/firestore';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (authUser) => {
            if (authUser) {
                setUser(authUser);

                // Real-time listener for profile changes (approval status)
                const unsubProfile = onSnapshot(doc(db, 'users', authUser.uid), async (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();

                        // Backfill existing users who don't have isApproved or city field
                        if (data.isApproved === undefined || data.city === undefined) {
                            const isAdmin = authUser.email === 'meoncu@gmail.com' || authUser.email === 'test@example.com';
                            const updates: any = {};
                            if (data.isApproved === undefined) updates.isApproved = isAdmin;
                            if (data.city === undefined) updates.city = 'Ankara';

                            await setDoc(doc(db, 'users', authUser.uid), {
                                ...data,
                                ...updates
                            }, { merge: true });
                            setProfile({ ...data, ...updates });
                        } else {
                            setProfile(data);
                        }
                    } else {
                        // New User Creation
                        const newProfile = {
                            uid: authUser.uid,
                            email: authUser.email,
                            displayName: authUser.displayName,
                            photoURL: authUser.photoURL,
                            lastLogin: serverTimestamp(),
                            isApproved: authUser.email === 'meoncu@gmail.com' || authUser.email === 'test@example.com', // Auto-approve admin
                            createdAt: serverTimestamp(),
                            city: 'Ankara' // Default city
                        };

                        // We use setDoc here. Since it didn't exist, we create it.
                        await setDoc(doc(db, 'users', authUser.uid), newProfile);
                        setProfile(newProfile);
                    }
                    setLoading(false);
                });

                // Update last login if profile exists (We do this once per auth session start mainly)
                // Actually, let's just do a fire-and-forget update
                updateLastLogin(authUser);

                return () => {
                    unsubProfile();
                };
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    const updateLastLogin = async (user: User) => {
        try {
            // We use updateDoc but need to be sure it exists. setDoc with merge is safer for "upsert" logic 
            // but we handled creation in the listener callback logic mostly.
            // Let's just do a merge set to update lastLogin
            await setDoc(doc(db, 'users', user.uid), {
                lastLogin: serverTimestamp(),
                photoURL: user.photoURL, // Keep photo sync
                displayName: user.displayName
            }, { merge: true });
        } catch (e) {
            console.error("Update login error", e);
        }
    }

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    const logout = () => signOut(auth);

    return { user, profile, loading, login, logout };
}
