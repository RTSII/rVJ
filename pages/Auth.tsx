
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      console.error('Sign in error:', error);
      toast.error(error.message || 'Failed to sign in');
    } else {
      toast.success('Signed in successfully!');
      navigate('/');
    }
    
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setLoading(true);

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      console.error('Sign up error:', error);
      toast.error(error.message || 'Failed to create account');
    } else {
      toast.success('Account created successfully! Please check your email to verify your account.');
    }
    
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* Lighting effect - back layer filling entire screen */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vh] bg-gradient-radial from-cyan-400/20 via-purple-500/15 to-transparent rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] bg-gradient-radial from-pink-400/15 via-blue-500/10 to-transparent rounded-full blur-2xl"></div>
      </div>

      {/* Main content container - full screen */}
      <div className="relative z-10 w-full h-full">
        <div className="relative w-full h-full">
          {/* RVJ Logo - scaled to fill more of the screen */}
          <img 
            src="/lovable-uploads/68782036-637d-4eae-9d56-aeb41156f0bd.png" 
            alt="RVJ Logo" 
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[min(90vw,700px)] h-[min(90vh,700px)] object-contain z-20"
          />
          
          {/* Form elements positioned precisely over the logo - top layer */}
          <div className="absolute inset-0 z-30">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full h-full">
              <TabsContent value="signin" className="w-full h-full">
                <form onSubmit={handleSignIn} className="relative w-full h-full">
                  {/* Position 1: Sign In text at very top of logo area */}
                  <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2">
                    <h2 className="text-xl font-bold text-white">Sign In</h2>
                  </div>
                  
                  {/* Position 2: Email and password fields in center of logo */}
                  <div className="absolute top-[45%] left-1/2 transform -translate-x-1/2 space-y-3">
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-8 text-sm px-3 w-48"
                    />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-8 text-sm px-3 w-48"
                    />
                  </div>
                  
                  {/* Position 3: Sign In button lower middle */}
                  <div className="absolute top-[62%] left-1/2 transform -translate-x-1/2">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-gradient-to-r from-cyan-500/80 to-purple-600/80 hover:from-cyan-600/90 hover:to-purple-700/90 text-white font-semibold shadow-lg backdrop-blur-md border border-cyan-400/30 h-8 text-sm w-48"
                    >
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </div>
                  
                  {/* Position 4: Switch to sign up link at bottom */}
                  <div className="absolute top-[75%] left-1/2 transform -translate-x-1/2">
                    <p className="text-slate-300 text-sm text-center">
                      Don't have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signup')}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                      >
                        Sign up here
                      </button>
                    </p>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="w-full h-full">
                <form onSubmit={handleSignUp} className="relative w-full h-full">
                  {/* Position 1: Sign Up text at very top of logo area */}
                  <div className="absolute top-[25%] left-1/2 transform -translate-x-1/2">
                    <h2 className="text-xl font-bold text-white">Sign Up</h2>
                  </div>
                  
                  {/* Position 2: Form fields in center of logo */}
                  <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 space-y-2">
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-7 text-sm px-3 w-48"
                    />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-7 text-sm px-3 w-48"
                    />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-7 text-sm px-3 w-48"
                    />
                    <Input
                      id="confirm-password"
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      className="bg-black/70 border-cyan-400/50 text-white placeholder:text-slate-300 focus:border-cyan-400 focus:ring-cyan-400/30 text-center backdrop-blur-md h-7 text-sm px-3 w-48"
                    />
                  </div>
                  
                  {/* Position 3: Sign Up button lower middle */}
                  <div className="absolute top-[65%] left-1/2 transform -translate-x-1/2">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="bg-gradient-to-r from-cyan-500/80 to-purple-600/80 hover:from-cyan-600/90 hover:to-purple-700/90 text-white font-semibold shadow-lg backdrop-blur-md border border-cyan-400/30 h-8 text-sm w-48"
                    >
                      {loading ? 'Creating account...' : 'Sign Up'}
                    </Button>
                  </div>
                  
                  {/* Position 4: Switch to sign in link at bottom */}
                  <div className="absolute top-[75%] left-1/2 transform -translate-x-1/2">
                    <p className="text-slate-300 text-sm text-center">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => setActiveTab('signin')}
                        className="text-cyan-400 hover:text-cyan-300 underline font-medium"
                      >
                        Sign in here
                      </button>
                    </p>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
