import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/store';
import { api } from '@/lib/api';
import { Github, Loader2, Shield, Bot, Zap } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, setUser, setAuthenticated } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledCode = useRef<string | null>(null);

  const code = searchParams.get('code');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
      return;
    }

    if (code && code !== handledCode.current) {
      handledCode.current = code;
      handleGitHubCallback(code);
    }
  }, [isAuthenticated, code]);

  const handleGitHubCallback = async (code: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.githubLogin(code, window.location.origin + '/login');

      if (response.success && response.data) {
        api.setToken(response.data.access_token);
        setUser(response.data.user);
        setAuthenticated(true);
        navigate('/');
      } else {
        setError(response.error?.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
    const redirectUri = window.location.origin + '/login';
    const scope = 'repo read:org read:user user:email';

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;
    window.location.href = githubAuthUrl;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Features */}
        <div className="space-y-6 hidden lg:block">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">
              GitGuard AI
            </h1>
            <p className="text-xl text-muted-foreground">
              Intelligent GitHub Repository Management
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Bot className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">AI Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Automatically detect AI-generated code, issues, and pull requests with high accuracy
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Smart Rules</h3>
                <p className="text-sm text-muted-foreground">
                  Create custom automation rules to handle AI contributions based on your policies
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Real-time Analytics</h3>
                <p className="text-sm text-muted-foreground">
                  Get insights into AI activity trends and contributor behavior across your repositories
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Github className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in with your GitHub account to continue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <Github className="mr-2 h-5 w-5" />
                  Continue with GitHub
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure OAuth Login
                </span>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              By signing in, you agree to our Terms of Service and Privacy Policy.
              <br />
              We only request permissions necessary for repository monitoring.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
