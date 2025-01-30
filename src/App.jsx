import React, { useState, useEffect } from 'react';
import { ethers } from "ethers";
import abi from './abi.json';

function App() {
    const [contract, setContract] = useState(null);
    const [account, setAccount] = useState('');
    const [tasks, setTasks] = useState([]);
    const [taskTitle, setTaskTitle] = useState('');
    const [taskText, setTaskText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const contractAddress = "0xC43A3A899BAd036a8d6D30B31A6046a1fA48a036";

    useEffect(() => {
        checkWalletConnection();
        setupEventListeners();
        return () => removeEventListeners();
    }, []);

    // Check if wallet is already connected
    const checkWalletConnection = async () => {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    setAccount(accounts[0]);
                    await initializeContract();
                }
            }
        } catch (err) {
            console.error("Error checking wallet connection:", err);
        }
    };

    const setupEventListeners = () => {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        }
    };

    const removeEventListeners = () => {
        if (window.ethereum) {
            window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
    };

    const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
            // User disconnected their wallet
            setIsConnected(false);
            setAccount('');
            setContract(null);
        } else {
            // Account changed
            setAccount(accounts[0]);
            await initializeContract();
        }
    };

    const handleChainChanged = () => {
        window.location.reload();
    };

    const initializeContract = async () => {
        try {
            setLoading(true);
            setError('');
            
            if (!window.ethereum) {
                throw new Error("Please install MetaMask!");
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const taskContract = new ethers.Contract(contractAddress, abi, signer);
            
            setContract(taskContract);
            setIsConnected(true);
            
            // Load tasks after contract initialization
            await fetchTasks(taskContract);
        } catch (err) {
            setError(err.message);
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    const connectWallet = async () => {
        try {
            setLoading(true);
            setError('');
            
            if (!window.ethereum) {
                throw new Error("Please install MetaMask!");
            }

            const accounts = await window.ethereum.request({
                method: "eth_requestAccounts"
            });
            
            setAccount(accounts[0]);
            await initializeContract();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchTasks = async (contractInstance = contract) => {
        if (!contractInstance) return;
        
        try {
            setLoading(true);
            const fetchedTasks = await contractInstance.getMyTask();
            
            const formattedTasks = fetchedTasks.map(task => ({
                id: Number(task.id),
                taskTitle: task.taskTitle,
                taskText: task.taskText,
                isDeleted: task.isDeleted
            }));
            
            setTasks(formattedTasks);
        } catch (err) {
            setError("Failed to fetch tasks: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const addTask = async (e) => {
        e.preventDefault();
        
        if (!contract) {
            setError("Please connect your wallet first");
            return;
        }

        try {
            setLoading(true);
            setError('');

            const tx = await contract.addTask(taskText, taskTitle, false);
            await tx.wait();

            // Clear form
            setTaskTitle('');
            setTaskText('');

            // Refresh tasks
            await fetchTasks();
        } catch (err) {
            setError("Failed to add task: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteTask = async (id) => {
        if (!contract) return;

        try {
            setLoading(true);
            setError('');

            const tx = await contract.deleteTask(id);
            await tx.wait();

            await fetchTasks();
        } catch (err) {
            setError("Failed to delete task: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Task Manager</h1>
            
            {!isConnected ? (
                <button 
                    onClick={connectWallet}
                    className="bg-green-500 text-white px-4 py-2 rounded mb-4 hover:bg-green-600 transition-colors"
                    disabled={loading}
                >
                    {loading ? 'Connecting...' : 'Connect Wallet'}
                </button>
            ) : (
                <div className="mb-4 text-sm text-gray-600">
                    Connected: {account.slice(0, 6)}...{account.slice(-4)}
                </div>
            )}
            
            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 relative">
                    <span className="block sm:inline">{error}</span>
                </div>
            )}

            {isConnected && (
                <>
                    <form onSubmit={addTask} className="mb-6">
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder="Task Title"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        <div className="mb-4">
                            <textarea
                                placeholder="Task Description"
                                value={taskText}
                                onChange={(e) => setTaskText(e.target.value)}
                                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                required
                                disabled={loading}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Task'}
                        </button>
                    </form>

                    <div className="space-y-4">
                        {loading && <div className="text-center py-4">Loading tasks...</div>}
                        
                        {!loading && tasks.length === 0 && (
                            <p className="text-center text-gray-500">No tasks found</p>
                        )}

                        {tasks.map(task => (
                            <div key={task.id} className="border p-4 rounded shadow hover:shadow-md transition-shadow">
                                <h3 className="font-bold text-lg mb-2">{task.taskTitle}</h3>
                                <p className="text-gray-600 mb-4">{task.taskText}</p>
                                <button
                                    onClick={() => deleteTask(task.id)}
                                    disabled={loading}
                                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 transition-colors disabled:opacity-50"
                                >
                                    Delete
                                </button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}

export default App;