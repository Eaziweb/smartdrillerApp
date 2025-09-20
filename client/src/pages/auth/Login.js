"use client";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import styles from "../../styles/auth.module.css";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [otp, setOtp] = useState("");
  const [showOtpForm, setShowOtpForm] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { login, verifyDeviceOTP } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const result = await login(formData);
      
      if (!result) {
        setError("No response from server. Please try again.");
        return;
      }
      
      if (result.success) {
        navigate("/home");
      } else if (result.requiresDeviceOTP) {
        setShowOtpForm(true);
      } else {
        setError(result.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      setError("An unexpected error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      const verifyData = {
        email: formData.email,
        otp,
        deviceName: deviceName || "Unknown Device",
      };
      
      const result = await verifyDeviceOTP(verifyData);
      
      if (result.success) {
        navigate("/home");
      } else {
        setError(result.message || "OTP verification failed");
      }
    } catch (error) {
      console.error("OTP error:", error);
      setError("Failed to verify OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.authPage}>
      <div className={`${styles.authContainer} ${styles.signinContainer}`}>
        <div className={styles.authHeader}>
          <Link to="/" className={styles.backBtn}>
            <i className="fas fa-arrow-left"></i>
          </Link>
          <h1 className={styles.appLogo}>SmartDrill</h1>
        </div>
        
        {!showOtpForm ? (
          <div className={styles.signinForm}>
            <div className={styles.formHeader}>
              <h1>Welcome Back</h1>
              <p>Sign in to continue your learning journey</p>
            </div>
            
            <form onSubmit={handleLoginSubmit}>
              {error && (
                <div className={styles.errorMessage}>{error}</div>
              )}
              
              <div className={styles.inputGroup}>
                <label htmlFor="email">Email Address</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="Enter your email"
                  disabled={loading}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordInputContainer}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <i className="fas fa-eye-slash"></i>
                    ) : (
                      <i className="fas fa-eye"></i>
                    )}
                  </button>
                </div>
              </div>
              
              <button 
                type="submit" 
                className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
                disabled={loading}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>Sign In</span>
                  <div className={styles.btnLoader}>
                    <div className={styles.spinner}></div>
                  </div>
                </div>
                <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
              </button>
            </form>
            
            <div className={styles.formFooter}>
              <p>
                <Link to="/forgot-password" className={styles.link}>
                  Forgot your password?
                </Link>
              </p>
              <p>
                Don't have an account?{" "}
                <Link to="/register" className={styles.link}>
                  Sign up
                </Link>
              </p>
            
            </div>
          </div>
        ) : (
          <div className={`${styles.signinForm} ${styles.otpForm}`}>
            <div className={styles.formHeader}>
              <h1>Verify Your Device</h1>
              <p>We've sent a verification code to your email</p>
              <p className={styles.deviceInfo}>
                <i className="fas fa-mobile-alt"></i> 
                {deviceName || "This device"}
              </p>
              <p className={styles.autoLoginNotice}>
                <i className="fas fa-info-circle"></i>
                After verification, you'll be logged in automatically
              </p>
            </div>
            
            <form onSubmit={handleOtpSubmit}>
              {error && (
                <div className={styles.errorMessage}>{error}</div>
              )}
              
              <div className={styles.inputGroup}>
                <label htmlFor="otp">Verification Code</label>
                <input
                  type="text"
                  id="otp"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  disabled={loading}
                />
              </div>
              
              <div className={styles.inputGroup}>
                <label htmlFor="deviceName">Device Name (Optional)</label>
                <input
                  type="text"
                  id="deviceName"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. My Laptop, Home PC"
                  disabled={loading}
                />
              </div>
              
              <button 
                type="submit" 
                className={`${styles.submitBtn} ${loading ? styles.loading : ""}`} 
                disabled={loading}
              >
                <div className={styles.btnContent}>
                  <span className={styles.btnText}>Verify & Log In</span>
                  <div className={styles.btnLoader}>
                    <div className={styles.spinner}></div>
                  </div>
                </div>
                <i className={`fas fa-arrow-right ${styles.btnArrow}`}></i>
              </button>
            </form>
            
            <div className={styles.formFooter}>
              <p>
                <button 
                  className={styles.link} 
                  onClick={() => setShowOtpForm(false)}
                  style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer' }}
                >
                  Back to Login
                </button>
              </p>
              <p>
                <button 
                  className={styles.link}
                  onClick={async () => {
                    try {
                      setLoading(true);
                      alert("OTP resend functionality would be implemented here");
                    } catch (error) {
                      setError("Failed to resend OTP");
                    } finally {
                      setLoading(false);
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: '#0066ff', cursor: 'pointer' }}
                  disabled={loading}
                >
                  Resend Code
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;