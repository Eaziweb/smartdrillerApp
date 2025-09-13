"use client";
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { FaLaptop, FaMobileAlt, FaTabletAlt, FaTrash, FaExclamationTriangle } from "react-icons/fa";
import styles from "../../styles/device-manager.module.css";

const DeviceManagement = () => {
  const { user, getTrustedDevices, removeTrustedDevice } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deviceToRemove, setDeviceToRemove] = useState(null);

  // Fetch devices on component mount
  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await getTrustedDevices();
      if (result.success) {
        setDevices(result.devices || []);
      } else {
        setError(result.message || "Failed to fetch devices");
      }
    } catch (error) {
      setError("An error occurred while fetching devices");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveClick = (device) => {
    setDeviceToRemove(device);
    setShowConfirmModal(true);
  };

  const confirmRemove = async () => {
    if (!deviceToRemove) return;
    
    setRemoving(deviceToRemove.deviceId);
    setError("");
    
    try {
      const result = await removeTrustedDevice(deviceToRemove.deviceId);
      if (result.success) {
        // Remove device from local state
        setDevices(prev => prev.filter(d => d.deviceId !== deviceToRemove.deviceId));
        setShowConfirmModal(false);
        setDeviceToRemove(null);
      } else {
        setError(result.message || "Failed to remove device");
      }
    } catch (error) {
      setError("An error occurred while removing the device");
    } finally {
      setRemoving(null);
    }
  };

  const getDeviceIcon = (deviceName) => {
    const name = deviceName.toLowerCase();
    if (name.includes("mobile") || name.includes("phone") || name.includes("iphone")) {
      return <FaMobileAlt className={styles.deviceIconMobile} />;
    } else if (name.includes("tablet") || name.includes("ipad")) {
      return <FaTabletAlt className={styles.deviceIconTablet} />;
    } else {
      return <FaLaptop className={styles.deviceIconLaptop} />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isCurrentDevice = (device) => {
    // Check if this device is in localStorage for the current user
    if (typeof window === "undefined" || !user) return false;
    
    const currentDeviceId = localStorage.getItem(`device_${user.email}`);
    return currentDeviceId === device.deviceId;
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Device Management</h1>
          <p>Manage the devices that have access to your account</p>
        </div>
        {error && (
          <div className={styles.alertDanger}>
            {error}
          </div>
        )}
        {loading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Loading your devices...</p>
          </div>
        ) : devices.length === 0 ? (
          <div className={styles.emptyState}>
            <FaLaptop className={styles.emptyIcon} />
            <h3>No Trusted Devices</h3>
            <p>You haven't trusted any devices yet. When you log in from a new device, you'll need to verify it with a code sent to your email.</p>
          </div>
        ) : (
          <div className={styles.devicesList}>
            <div className={styles.listHeader}>
              <h3>Your Trusted Devices ({devices.length})</h3>
              <p className={styles.listDescription}>
                These devices can access your account without needing a verification code each time.
              </p>
            </div>
            <div className={styles.devicesGrid}>
              {devices.map((device) => (
                <div key={device.deviceId} className={styles.deviceCard}>
                  <div className={styles.deviceHeader}>
                    {getDeviceIcon(device.deviceName)}
                    <div className={styles.deviceInfo}>
                      <h4 className={styles.deviceName}>{device.deviceName}</h4>
                      {isCurrentDevice(device) && (
                        <span className={styles.currentDeviceBadge}>Current Device</span>
                      )}
                    </div>
                  </div>
                  
                  <div className={styles.deviceDetails}>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Last Used:</span>
                      <span className={styles.detailValue}>{formatDate(device.lastUsed)}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <span className={styles.detailLabel}>Device ID:</span>
                      <span className={`${styles.detailValue} ${styles.fingerprint}`}>
                        {device.deviceId.substring(0, 8)}...
                      </span>
                    </div>
                  </div>
                  
                  <div className={styles.deviceActions}>
                    <button 
                      className={removing === device.deviceId ? styles.btnRemoveLoading : styles.btnRemove}
                      onClick={() => handleRemoveClick(device)}
                      disabled={removing === device.deviceId}
                    >
                      {removing === device.deviceId ? (
                        <>
                          <div className={styles.spinnerSmall}></div>
                          Removing...
                        </>
                      ) : (
                        <>
                          <FaTrash />
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className={styles.devicesFooter}>
              <div className={styles.infoBox}>
                <FaExclamationTriangle className={styles.infoIcon} />
                <div className={styles.infoContent}>
                  <h4>Security Tip</h4>
                  <p>
                    If you see a device you don't recognize, remove it immediately and change your password. 
                    Also consider enabling two-factor authentication for additional security.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Confirmation Modal */}
      {showConfirmModal && deviceToRemove && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContainer}>
            <div className={styles.modalHeader}>
              <h3>Remove Device</h3>
              <p>Are you sure you want to remove this device?</p>
            </div>
            
            <div className={styles.modalBody}>
              <div className={styles.devicePreview}>
                {getDeviceIcon(deviceToRemove.deviceName)}
                <div className={styles.devicePreviewInfo}>
                  <h4>{deviceToRemove.deviceName}</h4>
                  <p>Last used: {formatDate(deviceToRemove.lastUsed)}</p>
                </div>
              </div>
              
              <div className={styles.warningBox}>
                <FaExclamationTriangle className={styles.warningIcon} />
                <p>
                  After removal, this device will need to be verified again with a code sent to your email 
                  the next time you try to sign in.
                </p>
              </div>
            </div>
            
            <div className={styles.modalFooter}>
              <button 
                className={styles.btnCancel} 
                onClick={() => {
                  setShowConfirmModal(false);
                  setDeviceToRemove(null);
                }}
              >
                Cancel
              </button>
              <button 
                className={styles.btnConfirm} 
                onClick={confirmRemove}
                disabled={removing}
              >
                {removing ? "Removing..." : "Remove Device"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DeviceManagement;