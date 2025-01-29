import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "./abi.json";

const contractAddress = "0xC43A3A899BAd036a8d6D30B31A6046a1fA48a036";

let provider;
let signer;
let contract;

if (typeof window !== "undefined" && window.ethereum) {
  provider = new ethers.providers.Web3Provider(window.ethereum);
  signer = provider.getSigner();
  contract = new ethers.Contract(contractAddress, contractABI, signer);
}

export const addTask = async (taskTitle, taskText, isDeleted = false) => {
  try {
    const tx = await contract.addTask(taskText, taskTitle, isDeleted);
    await tx.wait();
    console.log("Task added successfully");
  } catch (error) {
    console.error("Error adding task:", error);
  }
};

export const deleteTask = async (taskId) => {
  try {
    const tx = await contract.deleteTask(taskId);
    await tx.wait();
    console.log("Task deleted successfully");
  } catch (error) {
    console.error("Error deleting task:", error);
  }
};

export const getMyTask = async () => {
  try {
    const tasks = await contract.getMyTask();
    return tasks.map(task => ({
      id: task.id.toNumber(),
      taskTitle: task.taskTitle,
      taskText: task.taskText,
      isDeleted: task.isDeleted,
    }));
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export default function TaskApp() {
  const [tasks, setTasks] = useState([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskText, setTaskText] = useState("");

  useEffect(() => {
    getMyTask().then(setTasks);
  }, []);

  const handleAddTask = async () => {
    await addTask(taskTitle, taskText);
    setTaskTitle("");
    setTaskText("");
    getMyTask().then(setTasks);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-gray-100 rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-4">Task Manager</h1>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Task Title"
          value={taskTitle}
          onChange={(e) => setTaskTitle(e.target.value)}
          className="w-full p-2 mb-2 border rounded-lg"
        />
        <textarea
          placeholder="Task Details"
          value={taskText}
          onChange={(e) => setTaskText(e.target.value)}
          className="w-full p-2 border rounded-lg"
        />
        <button
          onClick={handleAddTask}
          className="w-full bg-blue-500 text-white p-2 rounded-lg mt-2 hover:bg-blue-600"
        >
          Add Task
        </button>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id} className="p-4 mb-2 bg-white rounded-lg shadow">
            <h2 className="font-semibold">{task.taskTitle}</h2>
            <p>{task.taskText}</p>
            <button
              onClick={() => deleteTask(task.id).then(() => getMyTask().then(setTasks))}
              className="text-red-500 hover:underline"
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
