"use client"

import React, { createContext, useContext, useEffect, useState } from "react"

interface User {
  uid: string
  displayName: string | null
  email: string | null
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Check if user is already logged in (from localStorage or cookie)
  useEffect(() => {
    const savedUser = localStorage.getItem("mocklyUser")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (e) {
        console.error("Error parsing user data from localStorage", e)
      }
    }
    setLoading(false)
  }, [])

  // Login function
  const login = async (email: string, password: string) => {
    setLoading(true)
    try {
      // Mock authentication - replace with real auth logic
      // In a real app, you would call your authentication API here
      const mockUser: User = {
        uid: "mock-uid-12345",
        displayName: email.split("@")[0],
        email: email
      }
      
      setUser(mockUser)
      localStorage.setItem("mocklyUser", JSON.stringify(mockUser))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to login")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Register function
  const register = async (email: string, password: string, name: string) => {
    setLoading(true)
    try {
      // Mock registration - replace with real auth logic
      // In a real app, you would call your registration API here
      const mockUser: User = {
        uid: `user-${Math.random().toString(36).substring(2, 9)}`,
        displayName: name,
        email: email
      }
      
      setUser(mockUser)
      localStorage.setItem("mocklyUser", JSON.stringify(mockUser))
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to register")
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Logout function
  const logout = async () => {
    setLoading(true)
    try {
      // Mock logout - replace with real auth logic
      localStorage.removeItem("mocklyUser")
      setUser(null)
      setError(null)
    } catch (err: any) {
      setError(err.message || "Failed to logout")
      throw err
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
} 