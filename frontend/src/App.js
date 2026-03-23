import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import axios from "axios";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./contract";

function App() {
  // Auth state
  const [user, setUser] = useState(null);
  const [isLogin, setIsLogin] = useState(true);
  const [authStep, setAuthStep] = useState("credentials");
  const [tempUser, setTempUser] = useState(null);
  
  // Account selection for blockchain role
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  
  // Auth form fields with validation
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authRole, setAuthRole] = useState("patient");
  
  // Validation errors
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Blockchain state
  const [account, setAccount] = useState("");
  const [role, setRole] = useState("");
  const [recordCount, setRecordCount] = useState("");
  const [records, setRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Payment and Logs state
  const [recordFee, setRecordFee] = useState("");
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [showPendingSection, setShowPendingSection] = useState(false);

  const [doctorAddress, setDoctorAddress] = useState("");
  const [patientAddress, setPatientAddress] = useState("");
  const [viewPatientAddress, setViewPatientAddress] = useState("");

  const [recordName, setRecordName] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatment, setTreatment] = useState("");

  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("");

  const PINATA_API_KEY = "01efe232a0a8f7ebaf94";
  const PINATA_SECRET_KEY = "a1ca198a887b9c6e7f098eca461499b0d6cdb04bdd74d731ef876fa96c80ce29";

  // Get patient pending records - wrapped in useCallback
  const getPatientPendingRecords = useCallback(async () => {
    if (!account || role !== "Patient") return;
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      
      const pending = await contract.getPendingRecords(account);
      
      const formattedPending = pending.map((record, index) => ({
        id: index,
        doctor: record[1],
        name: record[2],
        diagnosis: record[3],
        treatment: record[4],
        fileHash: record[5],
        fee: record[6],
        timestamp: record[7],
        status: record[8]
      }));
      
      setPendingRecords(formattedPending);
      if (formattedPending.length > 0) {
        addLog(`Found ${formattedPending.length} pending records for approval`, "info");
      }
      
    } catch (error) {
      console.error("Error fetching pending records:", error);
    }
  }, [account, role]);

  // Listen for MetaMask account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
          setAccount("");
          setRole("");
          setError("Please connect your wallet");
        } else {
          const newAccount = accounts[0];
          setAccount(newAccount);
          
          if (user && user.wallet && newAccount.toLowerCase() !== user.wallet.toLowerCase()) {
            setError("Connected wallet does not match your registered wallet");
            setAccount("");
            setRole("");
          } else {
            await checkRole(newAccount);
            addLog(`Wallet switched to ${formatAddress(newAccount)}`, "info");
            setTimeout(() => setSuccessMessage(""), 3000);
          }
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, [user]);

  // Fetch pending records when role changes to Patient
  useEffect(() => {
    if (role === "Patient" && account) {
      getPatientPendingRecords();
    }
  }, [role, account, getPatientPendingRecords]);

  // Add log function
  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleString();
    setLogs(prev => [{ timestamp, message, type }, ...prev].slice(0, 100));
  };

  // Validation functions
  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePassword = (password) => {
    return password.length >= 8;
  };

  const validateName = (name) => {
    return name.trim().length >= 2;
  };

  const validateSignup = () => {
    const newErrors = {};

    if (!validateName(name)) {
      newErrors.name = "Name must be at least 2 characters";
    }

    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateLogin = () => {
    const newErrors = {};

    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleBlur = (field) => {
    setTouched({ ...touched, [field]: true });
  };

  // Format address
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  // Handle signup
  const handleSignup = async () => {
    if (!validateSignup()) return;

    try {
      setLoading(true);
      setError("");
      
      const res = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role: authRole }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        addLog(`New user registered: ${email} (${authRole})`, "success");
        setSuccessMessage("Registration successful! Please login.");
        setTimeout(() => setSuccessMessage(""), 3000);
        setIsLogin(true);
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setErrors({});
        setTouched({});
      } else {
        setError(data.message || "Registration failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle login
  const handleLogin = async () => {
    if (!validateLogin()) return;

    try {
      setLoading(true);
      setError("");
      
      const res = await fetch("http://localhost:5000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        addLog(`User logged in: ${data.email} (${data.role})`, "success");
        setTempUser(data);
        setAuthStep("wallet");
        setError("");
      } else {
        setError(data.message || "Invalid email or password");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Connect MetaMask and show account selector
  const connectMetaMask = async () => {
    try {
      setLoading(true);
      setError("");

      if (!window.ethereum) {
        setError("Please install MetaMask");
        setLoading(false);
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (accounts.length === 0) {
        setError("No account selected");
        setLoading(false);
        return;
      }

      addLog(`MetaMask connected, found ${accounts.length} accounts`, "info");

      const accountsWithRoles = await Promise.all(
        accounts.map(async (acc) => {
          const role = await getAccountRole(acc);
          return { address: acc, role };
        })
      );

      setAvailableAccounts(accountsWithRoles);
      setShowAccountSelector(true);
      setLoading(false);

    } catch (error) {
      console.error("Wallet connection error:", error);
      if (error.code === 'ACTION_REJECTED') {
        setError("You rejected the wallet connection");
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
      setLoading(false);
    }
  };

  // Get account role from blockchain
  const getAccountRole = async (address) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const owner = await contract.owner();
      if (owner.toLowerCase() === address.toLowerCase()) {
        return "Owner";
      }

      const isDoctor = await contract.authorizedDoctors(address);
      return isDoctor ? "Doctor" : "Patient";
    } catch (error) {
      console.error("Error getting role:", error);
      return "Unknown";
    }
  };

  // Handle account selection
  const handleAccountSelection = async () => {
    try {
      if (!selectedAccount) {
        setError("Please select an account");
        return;
      }

      setLoading(true);
      setError("");

      const selectedAccountData = availableAccounts.find(a => a.address === selectedAccount);

      if (tempUser.wallet && tempUser.wallet.toLowerCase() !== selectedAccount.toLowerCase()) {
        setError("Selected wallet does not match your registered wallet");
        setLoading(false);
        return;
      }

      if (!tempUser.wallet) {
        await fetch("http://localhost:5000/api/update-wallet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: tempUser.email, wallet: selectedAccount }),
        });
        tempUser.wallet = selectedAccount;
        addLog(`Wallet ${formatAddress(selectedAccount)} linked to account ${tempUser.email}`, "success");
      }

      setAccount(selectedAccount);
      setRole(selectedAccountData.role);
      setUser(tempUser);
      
      addLog(`Login successful as ${selectedAccountData.role}`, "success");
      setSuccessMessage("Login successful! Welcome back.");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      setAuthStep("credentials");
      setShowAccountSelector(false);
      setTempUser(null);
      setAvailableAccounts([]);
      setSelectedAccount("");
      setEmail("");
      setPassword("");

    } catch (error) {
      console.error("Account selection error:", error);
      setError("Failed to verify account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    addLog(`User logged out: ${user?.email}`, "info");
    setUser(null);
    setTempUser(null);
    setAccount("");
    setRole("");
    setRecords([]);
    setPendingRecords([]);
    setRecordCount("");
    setAuthStep("credentials");
    setShowAccountSelector(false);
    setAvailableAccounts([]);
    setSelectedAccount("");
    setSuccessMessage("Logged out successfully");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  // Connect wallet (for dashboard)
  const connectWallet = async () => {
    try {
      setError("");
      if (!window.ethereum) {
        setError("Please install MetaMask");
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const network = await provider.getNetwork();

      if (network.chainId !== 1337n && network.chainId !== 31337n) {
        setError("Please switch to Ganache/Hardhat network");
        return;
      }

      const accounts = await provider.send("eth_requestAccounts", []);
      
      if (user.wallet && accounts[0].toLowerCase() !== user.wallet.toLowerCase()) {
        setError("Connected wallet does not match your registered wallet");
        return;
      }

      setAccount(accounts[0]);
      await checkRole(accounts[0]);
      addLog(`Wallet connected: ${formatAddress(accounts[0])}`, "success");
      setSuccessMessage("Wallet connected successfully");
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (error) {
      console.error("Connection error:", error);
      setError("Failed to connect wallet");
    }
  };

  // Check blockchain role
  const checkRole = async (userAddress) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const owner = await contract.owner();
      if (owner.toLowerCase() === userAddress.toLowerCase()) {
        setRole("Owner");
        return;
      }

      const isDoctor = await contract.authorizedDoctors(userAddress);
      setRole(isDoctor ? "Doctor" : "Patient");
    } catch (error) {
      console.error("Role check error:", error);
      setError("Failed to check role");
    }
  };

  // Authorize doctor
  const authorizeDoctor = async () => {
    try {
      if (!doctorAddress) {
        setError("Please enter doctor address");
        return;
      }

      if (!ethers.isAddress(doctorAddress)) {
        setError("Please enter a valid Ethereum address");
        return;
      }

      setLoading(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const signerAddress = await signer.getAddress();
      const owner = await contract.owner();
      
      if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
        setError("Only the contract owner can authorize doctors");
        setLoading(false);
        return;
      }

      addLog(`Authorizing doctor: ${formatAddress(doctorAddress)}`, "pending");
      setSuccessMessage("Transaction submitted! Please confirm in MetaMask...");
      
      const tx = await contract.authorizeDoctor(doctorAddress);
      await tx.wait();
      
      addLog(`Doctor authorized: ${formatAddress(doctorAddress)}`, "success");
      setSuccessMessage("Doctor authorized successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      setDoctorAddress("");

    } catch (error) {
      console.error("Authorization error:", error);
      if (error.code === 'ACTION_REJECTED') {
        setError("Transaction rejected in MetaMask");
      } else if (error.message && error.message.includes("insufficient funds")) {
        setError("Insufficient funds for transaction");
      } else {
        setError(error.message || "Authorization failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Upload to IPFS
  const uploadToIPFS = async (file) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        formData,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY
          }
        }
      );

      return res.data.IpfsHash;
    } catch (error) {
      console.error("IPFS upload error:", error);
      throw new Error("Failed to upload file");
    }
  };

  // Create Pending Record (Doctor)
  const createPendingRecord = async () => {
    try {
      if (!patientAddress || !recordName || !diagnosis || !treatment || !recordFee) {
        setError("Please fill all required fields including fee");
        return;
      }

      if (!ethers.isAddress(patientAddress)) {
        setError("Please enter a valid patient address");
        return;
      }

      const feeInWei = ethers.parseEther(recordFee);
      
      if (feeInWei <= 0) {
        setError("Fee must be greater than 0");
        return;
      }

      setLoading(true);
      setError("");

      let fileHash = "";
      if (file) {
        try {
          setSuccessMessage("Uploading file to IPFS...");
          fileHash = await uploadToIPFS(file);
          addLog(`File uploaded to IPFS: ${fileHash.substring(0, 15)}...`, "info");
        } catch (ipfsError) {
          setError("File upload failed, continuing without file");
        }
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const signerAddress = await signer.getAddress();
      
      // Check if doctor is authorized
      const isDoctor = await contract.authorizedDoctors(signerAddress);
      const owner = await contract.owner();
      
      if (!isDoctor && owner.toLowerCase() !== signerAddress.toLowerCase()) {
        setError("Only authorized doctors can create records. Please contact the owner.");
        setLoading(false);
        return;
      }

      if (patientAddress === "0x0000000000000000000000000000000000000000") {
        setError("Invalid patient address");
        setLoading(false);
        return;
      }

      addLog(`Creating pending record for ${recordName} with fee ${recordFee} ETH`, "pending");
      setSuccessMessage("Transaction submitted! Please confirm in MetaMask...");
      
      const tx = await contract.createPendingRecord(
        patientAddress,
        recordName,
        diagnosis,
        treatment,
        fileHash,
        feeInWei
      );
      
      await tx.wait();
      
      addLog(`Pending record created for ${recordName}`, "success");
      addLog(`  ├─ Patient: ${recordName} needs to approve and pay ${recordFee} ETH`, "info");
      
      setSuccessMessage(`Pending record created! Patient ${recordName} needs to approve and pay ${recordFee} ETH.`);
      setTimeout(() => setSuccessMessage(""), 5000);

      setRecordName("");
      setDiagnosis("");
      setTreatment("");
      setFile(null);
      setFileName("");
      setPatientAddress("");
      setRecordFee("");

    } catch (error) {
      console.error("Transaction error:", error);
      if (error.code === 'ACTION_REJECTED') {
        setError("Transaction rejected in MetaMask");
      } else if (error.message && error.message.includes("authorized doctors")) {
        setError("You are not authorized as a doctor. Please contact the owner.");
      } else if (error.message && error.message.includes("Fee")) {
        setError("Fee must be greater than 0");
      } else {
        setError(error.message || "Transaction failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Approve and Pay (Patient)
  const approveAndPay = async (recordId, fee, doctorAddress) => {
    try {
      setLoading(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const feeInWei = ethers.parseEther(fee);
      
      // Check patient balance
      const balance = await provider.getBalance(await signer.getAddress());
      if (balance < feeInWei) {
        setError(`Insufficient funds. Need ${fee} ETH but have ${ethers.formatEther(balance)} ETH`);
        setLoading(false);
        return;
      }
      
      addLog(`Approving payment of ${fee} ETH to doctor ${formatAddress(doctorAddress)}`, "pending");
      setSuccessMessage("Transaction submitted! Please confirm in MetaMask...");
      
      const tx = await contract.approveAndPay(recordId, { value: feeInWei });
      await tx.wait();
      
      addLog(`Payment approved! Record ID: ${recordId}`, "payment");
      addLog(`  ├─ Patient debited: ${fee} ETH`, "debit");
      addLog(`  └─ Doctor credited: ${fee} ETH`, "credit");
      
      setSuccessMessage(`Payment of ${fee} ETH successful!`);
      setTimeout(() => setSuccessMessage(""), 5000);
      
      await getPatientPendingRecords();

    } catch (error) {
      console.error("Payment error:", error);
      if (error.code === 'ACTION_REJECTED') {
        setError("Transaction rejected in MetaMask");
      } else if (error.message.includes("insufficient funds")) {
        setError("Insufficient funds for payment");
      } else {
        setError(error.message || "Payment failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Reject Record (Patient)
  const rejectRecord = async (recordId) => {
    try {
      setLoading(true);
      setError("");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      addLog(`Rejecting record ${recordId}`, "pending");
      setSuccessMessage("Transaction submitted! Please confirm in MetaMask...");
      
      const tx = await contract.rejectRecord(recordId);
      await tx.wait();
      
      addLog(`Record ${recordId} rejected`, "info");
      setSuccessMessage("Record rejected successfully!");
      setTimeout(() => setSuccessMessage(""), 3000);
      
      await getPatientPendingRecords();

    } catch (error) {
      console.error("Rejection error:", error);
      if (error.code === 'ACTION_REJECTED') {
        setError("Transaction rejected in MetaMask");
      } else {
        setError(error.message || "Rejection failed");
      }
    } finally {
      setLoading(false);
    }
  };

  // Get record count
  const getRecordCount = async () => {
    if (!viewPatientAddress) {
      setError("Please enter patient address");
      return;
    }

    if (!ethers.isAddress(viewPatientAddress)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const count = await contract.getRecordCount(viewPatientAddress);
      setRecordCount(count.toString());
      addLog(`Retrieved record count for patient: ${formatAddress(viewPatientAddress)} - ${count.toString()} records`, "info");

    } catch (error) {
      console.error("Error getting record count:", error);
      setError("Failed to get record count");
    } finally {
      setLoading(false);
    }
  };

  // Get all records
  const getRecords = async () => {
    if (!viewPatientAddress) {
      setError("Please enter patient address");
      return;
    }

    if (!ethers.isAddress(viewPatientAddress)) {
      setError("Please enter a valid Ethereum address");
      return;
    }

    setLoading(true);
    setRecords([]);
    setError("");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

      const code = await provider.getCode(CONTRACT_ADDRESS);
      if (code === "0x") {
        setError("No contract found");
        setLoading(false);
        return;
      }

      const count = await contract.getRecordCount(viewPatientAddress);
      const total = Number(count);
      setRecordCount(total.toString());

      if (total === 0) {
        setError("No records found for this patient");
        setLoading(false);
        return;
      }

      let tempRecords = [];

      for (let i = 0; i < total; i++) {
        try {
          const data = contract.interface.encodeFunctionData("getRecord", [viewPatientAddress, i]);
          const result = await provider.call({ to: CONTRACT_ADDRESS, data });
          const decoded = contract.interface.decodeFunctionResult("getRecord", result);

          const statusMap = { 0: "Pending", 1: "Paid", 2: "Rejected" };
          
          tempRecords.push({
            name: decoded[0],
            diagnosis: decoded[1],
            treatment: decoded[2],
            file: decoded[3],
            timestamp: decoded[4],
            status: statusMap[Number(decoded[5])] || "Unknown",
            time: decoded[4] ? new Date(Number(decoded[4]) * 1000).toLocaleString() : "N/A",
          });
        } catch (e) {
          console.error(`Error loading record ${i}:`, e);
        }
      }

      setRecords(tempRecords);
      addLog(`Loaded ${tempRecords.length} records for patient ${formatAddress(viewPatientAddress)}`, "success");
      setSuccessMessage(`Loaded ${tempRecords.length} records`);
      setTimeout(() => setSuccessMessage(""), 3000);

    } catch (err) {
      console.error("Error in getRecords:", err);
      setError("Failed to fetch records");
    } finally {
      setLoading(false);
    }
  };

  // Open IPFS file
  const openIPFSFile = (hash) => {
    if (hash) {
      window.open(`https://gateway.pinata.cloud/ipfs/${hash}`, "_blank");
      addLog(`Opened IPFS file: ${hash.substring(0, 15)}...`, "info");
    }
  };

  // Handle file change
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }
    setFile(selectedFile);
    setFileName(selectedFile ? selectedFile.name : "");
  };

  // ==================== ENHANCED UI STYLES ====================
  const styles = {
    container: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0B1E33 0%, #1A3B5C 50%, #2C5282 100%)",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative",
    },
    card: {
      backgroundColor: "rgba(255, 255, 255, 0.98)",
      borderRadius: "24px",
      boxShadow: "0 20px 40px rgba(0, 20, 40, 0.2), 0 8px 16px rgba(0, 0, 0, 0.1)",
      padding: "2.5rem",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      backdropFilter: "blur(10px)",
    },
    button: {
      primary: {
        background: "linear-gradient(135deg, #2C5282 0%, #1A3B5C 100%)",
        color: "white",
        padding: "0.875rem 1.5rem",
        borderRadius: "12px",
        border: "none",
        fontSize: "0.9375rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 12px rgba(44, 82, 130, 0.3)",
        letterSpacing: "0.3px",
      },
      secondary: {
        background: "white",
        color: "#1A3B5C",
        padding: "0.875rem 1.5rem",
        borderRadius: "12px",
        border: "2px solid #E2E8F0",
        fontSize: "0.9375rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.05)",
      },
      danger: {
        background: "linear-gradient(135deg, #E53E3E 0%, #C53030 100%)",
        color: "white",
        padding: "0.875rem 1.5rem",
        borderRadius: "12px",
        border: "none",
        fontSize: "0.9375rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 12px rgba(229, 62, 62, 0.3)",
      },
      success: {
        background: "linear-gradient(135deg, #48BB78 0%, #2F855A 100%)",
        color: "white",
        padding: "0.875rem 1.5rem",
        borderRadius: "12px",
        border: "none",
        fontSize: "0.9375rem",
        fontWeight: "600",
        cursor: "pointer",
        transition: "all 0.3s ease",
        boxShadow: "0 4px 12px rgba(72, 187, 120, 0.3)",
      },
    },
    input: {
      width: "100%",
      padding: "0.875rem 1.25rem",
      borderRadius: "14px",
      border: "2px solid #E2E8F0",
      fontSize: "0.9375rem",
      transition: "all 0.3s ease",
      outline: "none",
      backgroundColor: "#F8FAFC",
      color: "#1A202C",
      boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.02)",
    },
    label: {
      display: "block",
      fontSize: "0.875rem",
      fontWeight: "600",
      color: "#2D3748",
      marginBottom: "0.5rem",
      letterSpacing: "0.3px",
      textTransform: "uppercase",
    },
    error: {
      background: "linear-gradient(135deg, #FEB2B2 0%, #FC8181 100%)",
      color: "#742A2A",
      padding: "1rem 1.25rem",
      borderRadius: "14px",
      border: "1px solid #FC8181",
      fontSize: "0.9375rem",
      marginBottom: "1.5rem",
      boxShadow: "0 4px 12px rgba(229, 62, 62, 0.15)",
      fontWeight: "500",
    },
    success: {
      background: "linear-gradient(135deg, #9AE6B4 0%, #68D391 100%)",
      color: "#22543D",
      padding: "1rem 1.25rem",
      borderRadius: "14px",
      border: "1px solid #68D391",
      fontSize: "0.9375rem",
      marginBottom: "1.5rem",
      boxShadow: "0 4px 12px rgba(72, 187, 120, 0.15)",
      fontWeight: "500",
    },
    validationError: {
      color: "#C53030",
      fontSize: "0.8125rem",
      marginTop: "0.5rem",
      fontWeight: "500",
      paddingLeft: "0.25rem",
    },
    dashboardCard: {
      backgroundColor: "rgba(255, 255, 255, 0.98)",
      borderRadius: "20px",
      boxShadow: "0 10px 30px rgba(0, 20, 40, 0.15), 0 4px 8px rgba(0, 0, 0, 0.05)",
      padding: "1.75rem",
      border: "1px solid rgba(226, 232, 240, 0.6)",
      transition: "transform 0.3s ease, boxShadow 0.3s ease",
    },
    roleBadge: (role) => ({
      display: "inline-block",
      padding: "0.35rem 1rem",
      background: role === "Owner" ? "linear-gradient(135deg, #F6E05E 0%, #ECC94B 100%)" : 
                role === "Doctor" ? "linear-gradient(135deg, #90CDF4 0%, #4299E1 100%)" : 
                "linear-gradient(135deg, #9AE6B4 0%, #48BB78 100%)",
      color: role === "Owner" ? "#744210" : 
             role === "Doctor" ? "#1A365D" : "#22543D",
      borderRadius: "30px",
      fontSize: "0.8125rem",
      fontWeight: "700",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
      border: "1px solid rgba(255, 255, 255, 0.3)",
      letterSpacing: "0.3px",
    }),
    recordCard: {
      border: "1px solid #EDF2F7",
      borderRadius: "16px",
      overflow: "hidden",
      backgroundColor: "#FFFFFF",
      transition: "all 0.3s ease",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.05)",
      marginBottom: "1rem",
    },
    sectionHeader: {
      fontSize: "1.5rem",
      fontWeight: "700",
      color: "#1A202C",
      marginBottom: "1.5rem",
      paddingBottom: "0.75rem",
      borderBottom: "3px solid #2C5282",
      position: "relative",
    },
    statsCard: {
      background: "linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)",
      borderRadius: "16px",
      padding: "1.25rem",
      border: "1px solid #E2E8F0",
      boxShadow: "inset 0 2px 4px rgba(255, 255, 255, 0.8), 0 4px 8px rgba(0, 0, 0, 0.05)",
    },
    valueDisplay: {
      fontSize: "1.25rem",
      fontWeight: "700",
      color: "#2C5282",
      marginTop: "0.25rem",
    },
    iconContainer: {
      width: "48px",
      height: "48px",
      borderRadius: "16px",
      background: "linear-gradient(135deg, #2C5282 0%, #1A3B5C 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "white",
      fontSize: "1.5rem",
      boxShadow: "0 4px 12px rgba(44, 82, 130, 0.3)",
    },
    logContainer: {
      backgroundColor: "#1A202C",
      borderRadius: "16px",
      padding: "1rem",
      maxHeight: "300px",
      overflowY: "auto",
      fontFamily: "monospace",
      fontSize: "0.8125rem",
    },
    logEntry: (type) => ({
      padding: "0.5rem",
      marginBottom: "0.5rem",
      borderRadius: "8px",
      backgroundColor: type === "success" ? "rgba(72, 187, 120, 0.2)" : 
                      type === "error" ? "rgba(229, 62, 62, 0.2)" :
                      type === "payment" ? "rgba(66, 153, 225, 0.2)" :
                      type === "debit" ? "rgba(237, 137, 54, 0.2)" :
                      type === "credit" ? "rgba(56, 161, 105, 0.2)" :
                      "rgba(160, 174, 192, 0.1)",
      borderLeft: `3px solid ${type === "success" ? "#48BB78" : 
                                 type === "error" ? "#E53E3E" :
                                 type === "payment" ? "#4299E1" :
                                 type === "debit" ? "#ED8936" :
                                 type === "credit" ? "#38A169" : "#A0AEC0"}`,
    }),
    pendingBadge: {
      background: "linear-gradient(135deg, #F6AD55 0%, #ED8936 100%)",
      color: "#744210",
      padding: "0.25rem 0.75rem",
      borderRadius: "30px",
      fontSize: "0.75rem",
      fontWeight: "600",
    },
    paidBadge: {
      background: "linear-gradient(135deg, #9AE6B4 0%, #48BB78 100%)",
      color: "#22543D",
      padding: "0.25rem 0.75rem",
      borderRadius: "30px",
      fontSize: "0.75rem",
      fontWeight: "600",
    },
    rejectedBadge: {
      background: "linear-gradient(135deg, #FEB2B2 0%, #FC8181 100%)",
      color: "#742A2A",
      padding: "0.25rem 0.75rem",
      borderRadius: "30px",
      fontSize: "0.75rem",
      fontWeight: "600",
    },
  };

  // If not logged in
  if (!user) {
    if (showAccountSelector) {
      return (
        <div style={styles.container}>
          <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem" }}>
            <div style={styles.card}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ ...styles.iconContainer, margin: "0 auto 1.5rem" }}>👤</div>
                <h2 style={{ fontSize: "2rem", fontWeight: "700", color: "#1A202C", marginBottom: "0.5rem" }}>
                  Select Your Role
                </h2>
                <p style={{ color: "#718096", fontSize: "1rem" }}>
                  Welcome, <span style={{ fontWeight: "700", color: "#2C5282" }}>{tempUser.name}</span>
                </p>
              </div>

              <div style={{ marginBottom: "2rem" }}>
                <label style={styles.label}>Choose Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  style={styles.input}
                >
                  <option value="">Select an account...</option>
                  {availableAccounts.map((acc, index) => (
                    <option key={acc.address} value={acc.address}>
                      Account {index + 1}: {formatAddress(acc.address)} • {acc.role}
                    </option>
                  ))}
                </select>
              </div>

              {error && <div style={styles.error}>{error}</div>}
              {successMessage && <div style={styles.success}>{successMessage}</div>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={handleAccountSelection}
                  disabled={loading || !selectedAccount}
                  style={{
                    ...styles.button.primary,
                    flex: 1,
                    opacity: (loading || !selectedAccount) ? 0.5 : 1,
                  }}
                >
                  {loading ? "Verifying..." : "Continue"}
                </button>
                <button
                  onClick={() => {
                    setShowAccountSelector(false);
                    setAvailableAccounts([]);
                    setSelectedAccount("");
                  }}
                  style={styles.button.secondary}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (authStep === "wallet" && tempUser) {
      return (
        <div style={styles.container}>
          <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem" }}>
            <div style={styles.card}>
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div style={{ ...styles.iconContainer, margin: "0 auto 1.5rem" }}>🔐</div>
                <h2 style={{ fontSize: "2rem", fontWeight: "700", color: "#1A202C", marginBottom: "0.5rem" }}>
                  Connect Your Wallet
                </h2>
                <p style={{ color: "#718096", fontSize: "1rem" }}>
                  Welcome back, <span style={{ fontWeight: "700", color: "#2C5282" }}>{tempUser.name}</span>
                </p>
              </div>

              {tempUser.wallet && (
                <div style={{ 
                  background: "linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)",
                  padding: "1.25rem", 
                  borderRadius: "16px",
                  marginBottom: "2rem",
                  border: "1px solid #E2E8F0",
                }}>
                  <div style={{ fontSize: "0.875rem", color: "#718096", marginBottom: "0.5rem", fontWeight: "600" }}>
                    Registered Wallet Address
                  </div>
                  <div style={{ 
                    fontFamily: "monospace", 
                    fontSize: "1rem", 
                    color: "#2C5282",
                    wordBreak: "break-all",
                    fontWeight: "500",
                    background: "white",
                    padding: "0.75rem",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                  }}>
                    {tempUser.wallet}
                  </div>
                </div>
              )}

              {error && <div style={styles.error}>{error}</div>}
              {successMessage && <div style={styles.success}>{successMessage}</div>}

              <div style={{ display: "flex", gap: "1rem" }}>
                <button
                  onClick={connectMetaMask}
                  disabled={loading}
                  style={{
                    ...styles.button.primary,
                    flex: 1,
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? "Connecting..." : "Connect MetaMask"}
                </button>
                <button
                  onClick={() => {
                    setAuthStep("credentials");
                    setTempUser(null);
                  }}
                  style={styles.button.secondary}
                >
                  Back
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "2rem" }}>
          <div style={styles.card}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ ...styles.iconContainer, margin: "0 auto 1.5rem" }}>⚕️</div>
              <h1 style={{ fontSize: "2.5rem", fontWeight: "800", color: "#1A202C", marginBottom: "0.5rem" }}>
                MediChain
              </h1>
              <p style={{ color: "#718096", fontSize: "1rem", letterSpacing: "1px" }}>
                Secure Healthcare Blockchain Platform
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "2rem" }}>
              <button
                onClick={() => {
                  setIsLogin(true);
                  setErrors({});
                  setTouched({});
                }}
                style={{
                  flex: 1,
                  padding: "1rem",
                  background: isLogin ? "linear-gradient(135deg, #2C5282 0%, #1A3B5C 100%)" : "white",
                  color: isLogin ? "white" : "#1A3B5C",
                  border: "2px solid",
                  borderColor: isLogin ? "transparent" : "#E2E8F0",
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: isLogin ? "0 4px 12px rgba(44, 82, 130, 0.3)" : "none",
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsLogin(false);
                  setErrors({});
                  setTouched({});
                }}
                style={{
                  flex: 1,
                  padding: "1rem",
                  background: !isLogin ? "linear-gradient(135deg, #2C5282 0%, #1A3B5C 100%)" : "white",
                  color: !isLogin ? "white" : "#1A3B5C",
                  border: "2px solid",
                  borderColor: !isLogin ? "transparent" : "#E2E8F0",
                  borderRadius: "14px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                  boxShadow: !isLogin ? "0 4px 12px rgba(44, 82, 130, 0.3)" : "none",
                }}
              >
                Create Account
              </button>
            </div>

            {error && <div style={styles.error}>{error}</div>}
            {successMessage && <div style={styles.success}>{successMessage}</div>}

            {isLogin ? (
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    style={{
                      ...styles.input,
                      borderColor: touched.email && errors.email ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.email && errors.email && (
                    <div style={styles.validationError}>{errors.email}</div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    style={{
                      ...styles.input,
                      borderColor: touched.password && errors.password ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.password && errors.password && (
                    <div style={styles.validationError}>{errors.password}</div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.button.primary,
                    width: "100%",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); handleSignup(); }} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div>
                  <label style={styles.label}>Full Name</label>
                  <input
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onBlur={() => handleBlur("name")}
                    style={{
                      ...styles.input,
                      borderColor: touched.name && errors.name ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.name && errors.name && (
                    <div style={styles.validationError}>{errors.name}</div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Email Address</label>
                  <input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => handleBlur("email")}
                    style={{
                      ...styles.input,
                      borderColor: touched.email && errors.email ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.email && errors.email && (
                    <div style={styles.validationError}>{errors.email}</div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Password</label>
                  <input
                    type="password"
                    placeholder="Create a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onBlur={() => handleBlur("password")}
                    style={{
                      ...styles.input,
                      borderColor: touched.password && errors.password ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.password && errors.password && (
                    <div style={styles.validationError}>{errors.password}</div>
                  )}
                  <div style={{ fontSize: "0.8125rem", color: "#718096", marginTop: "0.5rem", fontWeight: "500" }}>
                    Minimum 8 characters required
                  </div>
                </div>

                <div>
                  <label style={styles.label}>Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    onBlur={() => handleBlur("confirmPassword")}
                    style={{
                      ...styles.input,
                      borderColor: touched.confirmPassword && errors.confirmPassword ? "#FC8181" : "#E2E8F0",
                    }}
                  />
                  {touched.confirmPassword && errors.confirmPassword && (
                    <div style={styles.validationError}>{errors.confirmPassword}</div>
                  )}
                </div>

                <div>
                  <label style={styles.label}>Account Type</label>
                  <select 
                    value={authRole} 
                    onChange={(e) => setAuthRole(e.target.value)}
                    style={styles.input}
                  >
                    <option value="patient">Patient</option>
                    <option value="doctor">Doctor</option>
                  </select>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.button.primary,
                    width: "100%",
                    opacity: loading ? 0.5 : 1,
                  }}
                >
                  {loading ? "Creating Account..." : "Create Account"}
                </button>

                <p style={{ fontSize: "0.875rem", color: "#A0AEC0", textAlign: "center", marginTop: "1rem" }}>
                  By creating an account, you agree to our Terms of Service and Privacy Policy
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Dashboard
  return (
    <div style={styles.container}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem" }}>
        {/* Header */}
        <div style={{ 
          ...styles.dashboardCard,
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}>
          <div>
            <h1 style={styles.sectionHeader}>MediChain Dashboard</h1>
            <p style={{ color: "#718096", fontSize: "0.9375rem", marginTop: "0.5rem" }}>
              Contract: <span style={{ color: "#2C5282", fontFamily: "monospace", fontWeight: "600" }}>{formatAddress(CONTRACT_ADDRESS)}</span>
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontWeight: "700", color: "#1A202C", fontSize: "1.125rem" }}>{user.name}</div>
              <div style={{ fontSize: "0.875rem", color: "#718096", fontWeight: "500" }}>{user.role}</div>
              {user.wallet && (
                <div style={{ fontSize: "0.75rem", color: "#2C5282", fontFamily: "monospace", fontWeight: "600", marginTop: "0.25rem" }}>
                  {formatAddress(user.wallet)}
                </div>
              )}
            </div>
            <button 
              onClick={handleLogout} 
              style={styles.button.secondary}
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {successMessage && <div style={styles.success}>{successMessage}</div>}

        {/* Wallet Connection */}
        {!account ? (
          <div style={{ ...styles.dashboardCard, marginBottom: "2rem", textAlign: "center" }}>
            <p style={{ color: "#718096", marginBottom: "1.5rem", fontSize: "1.125rem" }}>
              Connect your MetaMask wallet to access blockchain features
            </p>
            <button 
              onClick={connectWallet}
              disabled={loading}
              style={styles.button.primary}
            >
              {loading ? "Connecting..." : "Connect Wallet"}
            </button>
          </div>
        ) : (
          <div style={{ 
            ...styles.dashboardCard, 
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "3rem",
            flexWrap: "wrap"
          }}>
            <div>
              <span style={{ fontSize: "0.875rem", color: "#718096", display: "block", marginBottom: "0.25rem", fontWeight: "600" }}>Connected Wallet</span>
              <span style={{ fontFamily: "monospace", fontSize: "1rem", color: "#1A202C", fontWeight: "600" }}>
                {formatAddress(account)}
              </span>
            </div>
            <div>
              <span style={{ fontSize: "0.875rem", color: "#718096", display: "block", marginBottom: "0.25rem", fontWeight: "600" }}>Blockchain Role</span>
              <span style={styles.roleBadge(role)}>
                {role}
              </span>
            </div>
            <div>
              <button 
                onClick={() => setShowLogs(!showLogs)}
                style={{
                  ...styles.button.secondary,
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                }}
              >
                {showLogs ? "Hide Logs" : "View Logs"} ({logs.length})
              </button>
            </div>
            {(role === "Patient" && pendingRecords.length > 0) && (
              <button 
                onClick={() => setShowPendingSection(!showPendingSection)}
                style={{
                  ...styles.button.primary,
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                }}
              >
                {showPendingSection ? "Hide Pending" : `Pending Approvals (${pendingRecords.length})`}
              </button>
            )}
          </div>
        )}

        {/* Logs Section */}
        {showLogs && logs.length > 0 && (
          <div style={{ ...styles.dashboardCard, marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#1A202C", marginBottom: "1rem" }}>
              System Logs
            </h2>
            <div style={styles.logContainer}>
              {logs.map((log, index) => (
                <div key={index} style={styles.logEntry(log.type)}>
                  <span style={{ color: "#A0AEC0", fontSize: "0.7rem" }}>[{log.timestamp}]</span>
                  <span style={{ marginLeft: "0.5rem", color: "#FFFFFF" }}>{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Records Section for Patients */}
        {role === "Patient" && account && showPendingSection && pendingRecords.length > 0 && (
          <div style={{ ...styles.dashboardCard, marginBottom: "2rem" }}>
            <h2 style={{ ...styles.sectionHeader, fontSize: "1.5rem" }}>Pending Approvals</h2>
            <p style={{ color: "#718096", marginBottom: "1.5rem", fontSize: "0.875rem" }}>
              Review and approve medical records. Payment will be processed upon approval.
            </p>
            <div style={{ display: "grid", gap: "1.25rem" }}>
              {pendingRecords.map((record, index) => (
                <div key={index} style={styles.recordCard}>
                  <div style={{
                    background: "linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)",
                    padding: "1.25rem",
                    borderBottom: "1px solid #E2E8F0",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                  }}>
                    <div>
                      <span style={{ fontWeight: "700", color: "#2C5282" }}>
                        Dr. {formatAddress(record.doctor)}
                      </span>
                      <span style={{ marginLeft: "1rem", ...styles.pendingBadge }}>
                        Pending Payment
                      </span>
                    </div>
                    <span style={{ fontSize: "1.125rem", fontWeight: "700", color: "#E53E3E" }}>
                      Fee: {ethers.formatEther(record.fee)} ETH
                    </span>
                  </div>
                  <div style={{ padding: "1.5rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                      <div style={{ color: "#718096", fontWeight: "600" }}>Patient Name:</div>
                      <div style={{ color: "#1A202C", fontWeight: "500" }}>{record.name}</div>

                      <div style={{ color: "#718096", fontWeight: "600" }}>Diagnosis:</div>
                      <div style={{ color: "#E53E3E", fontWeight: "500" }}>{record.diagnosis}</div>

                      <div style={{ color: "#718096", fontWeight: "600" }}>Treatment:</div>
                      <div style={{ color: "#2C5282", fontWeight: "500" }}>{record.treatment}</div>

                      <div style={{ color: "#718096", fontWeight: "600" }}>Date:</div>
                      <div style={{ color: "#718096" }}>{new Date(Number(record.timestamp) * 1000).toLocaleString()}</div>
                    </div>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                      <button
                        onClick={() => approveAndPay(record.id, ethers.formatEther(record.fee), record.doctor)}
                        disabled={loading}
                        style={{
                          ...styles.button.success,
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        {loading ? "Processing..." : "Approve & Pay"}
                      </button>
                      <button
                        onClick={() => rejectRecord(record.id)}
                        disabled={loading}
                        style={{
                          ...styles.button.danger,
                          opacity: loading ? 0.5 : 1,
                        }}
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Owner Section */}
        {role === "Owner" && account && (
          <div style={{ ...styles.dashboardCard, marginBottom: "2rem" }}>
            <h2 style={{ ...styles.sectionHeader, fontSize: "1.5rem" }}>Doctor Authorization</h2>
            <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                placeholder="Enter doctor's Ethereum address"
                value={doctorAddress}
                onChange={(e) => setDoctorAddress(e.target.value)}
                style={{ ...styles.input, flex: 1, minWidth: "300px" }}
                disabled={loading}
              />
              <button 
                onClick={authorizeDoctor}
                disabled={loading || !doctorAddress}
                style={{
                  ...styles.button.primary,
                  opacity: (loading || !doctorAddress) ? 0.5 : 1,
                }}
              >
                Authorize Doctor
              </button>
            </div>
          </div>
        )}

        {/* Doctor Section - Create Pending Record */}
        {role === "Doctor" && account && (
          <div style={{ ...styles.dashboardCard, marginBottom: "2rem" }}>
            <h2 style={{ ...styles.sectionHeader, fontSize: "1.5rem" }}>Create Medical Record</h2>
            <p style={{ color: "#718096", marginBottom: "1rem", fontSize: "0.875rem" }}>
              Create a pending record. Patient will need to approve and pay the consultation fee.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
              <div>
                <label style={styles.label}>Patient Address</label>
                <input
                  placeholder="0x..."
                  value={patientAddress}
                  onChange={(e) => setPatientAddress(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div>
                <label style={styles.label}>Patient Name</label>
                <input
                  placeholder="Enter patient name"
                  value={recordName}
                  onChange={(e) => setRecordName(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div>
                <label style={styles.label}>Diagnosis</label>
                <input
                  placeholder="Enter diagnosis"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div>
                <label style={styles.label}>Treatment</label>
                <input
                  placeholder="Enter treatment"
                  value={treatment}
                  onChange={(e) => setTreatment(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              <div>
                <label style={styles.label}>Consultation Fee (ETH)</label>
                <input
                  type="number"
                  placeholder="Enter fee (e.g., 0.05)"
                  value={recordFee}
                  onChange={(e) => setRecordFee(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                  step="0.01"
                  min="0"
                />
              </div>

              <div style={{ gridColumn: "1/-1" }}>
                <label style={styles.label}>Medical Document</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  disabled={loading}
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                  style={{ fontSize: "0.9375rem" }}
                />
                {fileName && (
                  <span style={{ fontSize: "0.875rem", color: "#2C5282", marginLeft: "0.75rem", fontWeight: "500" }}>
                    Selected: {fileName}
                  </span>
                )}
              </div>
            </div>

            <button 
              onClick={createPendingRecord}
              disabled={loading || !patientAddress || !recordName || !diagnosis || !treatment || !recordFee}
              style={{
                ...styles.button.primary,
                width: "100%",
                marginTop: "2rem",
                opacity: (loading || !patientAddress || !recordName || !diagnosis || !treatment || !recordFee) ? 0.5 : 1,
              }}
            >
              {loading ? "Processing..." : "Create Pending Record"}
            </button>
          </div>
        )}

        {/* Records Section - View All Records */}
        {account && (
          <div style={styles.dashboardCard}>
            <h2 style={{ ...styles.sectionHeader, fontSize: "1.5rem" }}>Medical Records</h2>
            
            <div style={{ 
              display: "flex", 
              gap: "1rem", 
              marginBottom: "2rem",
              flexWrap: "wrap"
            }}>
              <div style={{ flex: 1, minWidth: "300px" }}>
                <label style={styles.label}>Patient Address</label>
                <input
                  placeholder="Enter patient address to view records"
                  value={viewPatientAddress}
                  onChange={(e) => setViewPatientAddress(e.target.value)}
                  style={styles.input}
                  disabled={loading}
                />
              </div>
              
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end" }}>
                <button 
                  onClick={getRecordCount}
                  disabled={loading || !viewPatientAddress}
                  style={{
                    ...styles.button.secondary,
                    opacity: (loading || !viewPatientAddress) ? 0.5 : 1,
                  }}
                >
                  Get Count
                </button>

                <button 
                  onClick={getRecords}
                  disabled={loading || !viewPatientAddress}
                  style={{
                    ...styles.button.primary,
                    opacity: (loading || !viewPatientAddress) ? 0.5 : 1,
                  }}
                >
                  {loading ? "Loading..." : "View Records"}
                </button>
              </div>
            </div>

            {recordCount && (
              <div style={styles.statsCard}>
                <div style={{ fontSize: "0.9375rem", color: "#718096", fontWeight: "600" }}>Total Records</div>
                <div style={styles.valueDisplay}>{recordCount}</div>
              </div>
            )}

            {loading && (
              <div style={{ textAlign: "center", padding: "4rem" }}>
                <div style={{
                  border: "4px solid #E2E8F0",
                  borderTop: "4px solid #2C5282",
                  borderRadius: "50%",
                  width: "60px",
                  height: "60px",
                  animation: "spin 1s linear infinite",
                  margin: "0 auto 1.5rem"
                }}></div>
                <p style={{ color: "#718096", fontSize: "1rem", fontWeight: "500" }}>Loading medical records...</p>
                <style>{`
                  @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                  }
                `}</style>
              </div>
            )}

            {/* Records List */}
            {records.length > 0 && !loading && (
              <div style={{ marginTop: "2rem" }}>
                <h3 style={{ fontSize: "1.125rem", fontWeight: "600", color: "#1A202C", marginBottom: "1.5rem" }}>
                  Patient Records: <span style={{ color: "#2C5282", fontFamily: "monospace" }}>{formatAddress(viewPatientAddress)}</span>
                </h3>
                
                <div style={{ display: "grid", gap: "1.25rem" }}>
                  {records.map((record, index) => (
                    <div 
                      key={index}
                      style={styles.recordCard}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow = "0 12px 30px rgba(44, 82, 130, 0.15)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.05)";
                      }}
                    >
                      <div style={{
                        background: "linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%)",
                        padding: "1.25rem",
                        borderBottom: "1px solid #E2E8F0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "0.5rem",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                          <span style={{
                            background: "linear-gradient(135deg, #2C5282 0%, #1A3B5C 100%)",
                            color: "white",
                            width: "36px",
                            height: "36px",
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1rem",
                            fontWeight: "700",
                            boxShadow: "0 4px 10px rgba(44, 82, 130, 0.3)",
                          }}>
                            {index + 1}
                          </span>
                          <span style={{ fontSize: "1rem", fontWeight: "700", color: "#1A202C" }}>
                            Medical Record #{index + 1}
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <span style={
                            record.status === "Paid" ? styles.paidBadge :
                            record.status === "Pending" ? styles.pendingBadge :
                            styles.rejectedBadge
                          }>
                            {record.status}
                          </span>
                          <span style={{
                            fontSize: "0.875rem",
                            color: "#718096",
                            background: "white",
                            padding: "0.35rem 1rem",
                            borderRadius: "30px",
                            border: "1px solid #E2E8F0",
                            fontWeight: "500",
                          }}>
                            {record.time}
                          </span>
                        </div>
                      </div>

                      <div style={{ padding: "1.5rem" }}>
                        <div style={{ 
                          display: "grid",
                          gridTemplateColumns: "140px 1fr",
                          gap: "1rem",
                          fontSize: "0.9375rem",
                        }}>
                          <div style={{ color: "#718096", fontWeight: "600" }}>Patient Name:</div>
                          <div style={{ color: "#1A202C", fontWeight: "600" }}>{record.name}</div>

                          <div style={{ color: "#718096", fontWeight: "600" }}>Diagnosis:</div>
                          <div style={{ color: "#E53E3E", fontWeight: "500" }}>{record.diagnosis}</div>

                          <div style={{ color: "#718096", fontWeight: "600" }}>Treatment:</div>
                          <div style={{ color: "#2C5282", fontWeight: "500" }}>{record.treatment}</div>

                          <div style={{ color: "#718096", fontWeight: "600" }}>Document:</div>
                          <div>
                            {record.file ? (
                              <button
                                onClick={() => openIPFSFile(record.file)}
                                style={{
                                  ...styles.button.secondary,
                                  padding: "0.5rem 1.25rem",
                                  fontSize: "0.875rem",
                                  fontWeight: "600",
                                }}
                              >
                                View Document
                              </button>
                            ) : (
                              <span style={{ color: "#A0AEC0", fontStyle: "italic", fontWeight: "500" }}>No document attached</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;