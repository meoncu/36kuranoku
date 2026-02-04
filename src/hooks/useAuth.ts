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

                const userRef = doc(db, 'users', authUser.uid);

                try {
                    const docSnap = await getDoc(userRef);

                    if (!docSnap.exists()) {
                        const newProfile = {
                            uid: authUser.uid,
                            email: authUser.email,
                            displayName: authUser.displayName,
                            photoURL: authUser.photoURL,
                            lastLogin: serverTimestamp(),
                            isApproved: authUser.email === 'meoncu@gmail.com' || authUser.email === 'test@example.com',
                            createdAt: serverTimestamp(),
                            city: 'Ankara',
                            showPrayerTimes: true,
                            showResumeReading: true,
                            showInstallBanner: false
                        };
                        await setDoc(userRef, newProfile);
                        setProfile(newProfile);
                    } else {
                        const data = docSnap.data();
                        const updates: any = {
                            lastLogin: serverTimestamp(),
                            photoURL: authUser.photoURL
                        };

                        let needsUpdate = false;
                        if (data.isApproved === undefined) {
                            updates.isApproved = authUser.email === 'meoncu@gmail.com' || authUser.email === 'test@example.com';
                            needsUpdate = true;
                        }
                        if (data.city === undefined) {
                            updates.city = 'Ankara';
                            needsUpdate = true;
                        }
                        if (data.showPrayerTimes === undefined) {
                            updates.showPrayerTimes = true;
                            needsUpdate = true;
                        }
                        if (data.showResumeReading === undefined) {
                            updates.showResumeReading = true;
                            needsUpdate = true;
                        }
                        if (data.showInstallBanner === undefined) {
                            updates.showInstallBanner = false;
                            needsUpdate = true;
                        }

                        // Always update lastLogin & photo
                        await setDoc(userRef, updates, { merge: true });
                        setProfile({ ...data, ...updates });
                    }
                } catch (err) {
                    console.error("Profile load error:", err);
                }

                setLoading(false);

                // Real-time listener for profile changes (approval status, name updates, etc.)
                const unsubProfile = onSnapshot(userRef, (snap) => {
                    if (snap.exists()) {
                        setProfile({ id: snap.id, ...snap.data() });
                    }
                });

                return () => unsubProfile();
            } else {
                setUser(null);
                setProfile(null);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

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
