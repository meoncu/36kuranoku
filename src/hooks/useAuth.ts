import { useState, useEffect } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                // Save/Update user profile in Firestore
                // We use setDoc with merge: true to avoid overwriting existing data fields like specific settings if we add them later
                // But we want to update 'lastLogin' every time.
                try {
                    await setDoc(doc(db, 'users', user.uid), {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        lastLogin: serverTimestamp(),
                    }, { merge: true });
                } catch (error) {
                    console.error("Error saving user profile:", error);
                }
            }
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Login Error:", error);
        }
    };

    const logout = () => signOut(auth);

    return { user, loading, login, logout };
}
