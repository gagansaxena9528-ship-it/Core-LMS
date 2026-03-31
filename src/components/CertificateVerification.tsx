import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Award, 
  User, 
  BookOpen, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft,
  Download,
  Share2,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getDocument, subscribeToQuery } from '../services/firestore';
import { Certificate } from '../types';
import { format } from 'date-fns';

const CertificateVerification: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchId, setSearchId] = useState(id || '');

  useEffect(() => {
    if (id) {
      verifyCertificate(id);
    } else {
      setLoading(false);
    }
  }, [id]);

  const verifyCertificate = async (certId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Search by certificateId field
      const unsubscribe = subscribeToQuery('certificates', 'certificateId', '==', certId, (results) => {
        if (results.length > 0) {
          setCertificate(results[0]);
        } else {
          setError('Certificate not found. Please check the ID and try again.');
          setCertificate(null);
        }
        setLoading(false);
        unsubscribe(); // Only need one-time check for verification
      });
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred during verification.');
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      verifyCertificate(searchId.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30">
      {/* Header */}
      <header className="p-6 border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <Award className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">CoreLMS <span className="text-primary">Verify</span></span>
          </Link>
          <Link 
            to="/login"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portal
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 py-12 space-y-12">
        {/* Search Section */}
        <section className="text-center space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Verify <span className="text-primary">Authenticity</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Validate course completion certificates issued by CoreLMS Institute.
            </p>
          </motion.div>

          <form onSubmit={handleSearch} className="max-w-lg mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
            <div className="relative flex gap-2 p-2 bg-card border border-border rounded-2xl">
              <input
                type="text"
                placeholder="Enter Certificate ID (e.g. CERT-ABC123XYZ)"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 bg-transparent border-none focus:ring-0 px-4 py-3 text-lg font-mono placeholder:text-muted-foreground text-foreground"
              />
              <button 
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-primary hover:bg-primary/90 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <ShieldCheck className="w-5 h-5" />
                    Verify
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Result Section */}
        <section>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground animate-pulse">Verifying certificate credentials...</p>
            </div>
          ) : certificate ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-card/50 border border-border rounded-3xl overflow-hidden shadow-2xl"
            >
              <div className="p-8 md:p-12 flex flex-col md:flex-row gap-12">
                {/* Certificate Preview Card */}
                <div className="w-full md:w-1/3 space-y-6">
                  <div className="aspect-[3/4] bg-gradient-to-br from-muted to-card rounded-2xl border border-border p-6 flex flex-col items-center justify-center text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <Award className="w-20 h-20 text-primary mb-4" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold">Verified By</p>
                      <p className="text-sm font-bold text-foreground">CoreLMS Institute</p>
                    </div>
                    <div className="absolute bottom-6 left-6 right-6">
                      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
                        <div className="w-full h-full bg-primary"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button className="w-full py-3 bg-muted hover:bg-muted/80 text-foreground font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />
                      Download PDF
                    </button>
                    <button className="w-full py-3 border border-border hover:border-muted-foreground/30 text-muted-foreground hover:text-foreground font-semibold rounded-xl transition-all flex items-center justify-center gap-2">
                      <Share2 className="w-4 h-4" />
                      Share Verification
                    </button>
                  </div>
                </div>

                {/* Details Section */}
                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-success" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-foreground">Valid Certificate</h3>
                      <p className="text-muted-foreground">This certificate is authentic and verified.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                        <User className="w-3 h-3" />
                        Student Name
                      </p>
                      <p className="text-xl font-bold text-foreground">{certificate.studentName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                        <BookOpen className="w-3 h-3" />
                        Course Completed
                      </p>
                      <p className="text-xl font-bold text-foreground">{certificate.courseName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Issue Date
                      </p>
                      <p className="text-xl font-bold text-foreground">
                        {format(new Date(certificate.issueDate), 'MMMM dd, yyyy')}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold flex items-center gap-2">
                        <ShieldCheck className="w-3 h-3" />
                        Certificate ID
                      </p>
                      <p className="text-xl font-bold text-primary font-mono">{certificate.certificateId}</p>
                    </div>
                  </div>

                  <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <Award className="w-5 h-5 text-primary" />
                      Academic Achievement
                    </h4>
                    <div className="flex items-center justify-between">
                      <div className="text-center px-6 py-3 bg-card/50 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Grade</p>
                        <p className="text-2xl font-black text-primary">{certificate.grade || 'A+'}</p>
                      </div>
                      <div className="text-center px-6 py-3 bg-card/50 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Score</p>
                        <p className="text-2xl font-black text-foreground">
                          {certificate.score || 95}<span className="text-sm text-muted-foreground">/{certificate.totalMarks || 100}</span>
                        </p>
                      </div>
                      <div className="text-center px-6 py-3 bg-card/50 rounded-xl border border-border">
                        <p className="text-xs text-muted-foreground uppercase font-bold mb-1">Status</p>
                        <p className="text-2xl font-black text-success">PASSED</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : error ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-destructive/5 border border-destructive/20 rounded-3xl p-12 text-center space-y-6"
            >
              <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-destructive" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-foreground">Verification Failed</h3>
                <p className="text-muted-foreground max-w-md mx-auto">{error}</p>
              </div>
              <button 
                onClick={() => setError(null)}
                className="px-8 py-3 bg-muted hover:bg-muted/80 text-foreground font-bold rounded-xl transition-all"
              >
                Try Again
              </button>
            </motion.div>
          ) : (
            <div className="py-20 text-center space-y-4 opacity-50">
              <ShieldCheck className="w-16 h-16 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Enter a certificate ID above to start verification.</p>
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto py-12 border-t border-border/50 text-center">
        <p className="text-muted-foreground text-sm">
          &copy; {new Date().getFullYear()} CoreLMS Institute. All rights reserved.
          <br />
          <span className="flex items-center justify-center gap-4 mt-4">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-foreground transition-colors flex items-center gap-1">
              Contact Support
              <ExternalLink className="w-3 h-3" />
            </a>
          </span>
        </p>
      </footer>
    </div>
  );
};

export default CertificateVerification;
