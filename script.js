// Global variables
let tasks = [];
let draggedTask = null;

// DOM Elements
const taskModal = document.getElementById('taskModal');
const taskForm = document.getElementById('taskForm');
const createIssueBtn = document.getElementById('createIssueBtn');

// Status columns
const statusColumns = ['backlog', 'todo', 'in-progress', 'done'];

// Initialize the application
function init() {
    // Add a loading state
    document.body.classList.add('cursor-wait');
    
    // Load tasks with a small delay to show the loading state
    setTimeout(() => {
        loadTasks();
        setupEventListeners();
        renderAllTasks();
        document.body.classList.remove('cursor-wait');
    }, 300);
}

// Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('jira-tasks');
    tasks = savedTasks ? JSON.parse(savedTasks) : [];
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('jira-tasks', JSON.stringify(tasks));
}

// Setup event listeners
function setupEventListeners() {
    // Create issue button
    if (createIssueBtn) {
        createIssueBtn.addEventListener('click', () => openAddTaskModal('todo'));
    }
    
    // Task form submission
    if (taskForm) {
        taskForm.addEventListener('submit', handleTaskSubmit);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === taskModal) {
            closeTaskModal();
        }
    });
}

// Handle task form submission
function handleTaskSubmit(e) {
    e.preventDefault();
    
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const priority = document.getElementById('taskPriority').value;
    const assignee = document.getElementById('taskAssignee').value.trim();
    const status = document.getElementById('taskStatus').value;
    
    if (!title) return;
    
    const task = {
        id: Date.now().toString(),
        title,
        description,
        priority,
        assignee: assignee || 'Unassigned',
        status: status || 'todo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    
    tasks.push(task);
    saveTasks();
    renderAllTasks();
    closeTaskModal();
    taskForm.reset();
}

// Open add task modal
function openAddTaskModal(status = 'todo') {
    const modal = document.getElementById('taskModal');
    const taskStatus = document.getElementById('taskStatus');
    
    taskStatus.value = status;
    modal.style.display = 'flex';
    document.getElementById('taskTitle').focus();
}

// Close task modal
function closeTaskModal() {
    taskModal.style.display = 'none';
}

// Render all tasks in their respective columns
function renderAllTasks() {
    statusColumns.forEach(status => {
        renderTasksByStatus(status);
    });
    updateTaskCounts();
}

// Render tasks for a specific status
function renderTasksByStatus(status) {
    const column = document.getElementById(`${status}-tasks`);
    if (!column) return;
    
    const filteredTasks = tasks.filter(task => task.status === status);
    
    if (filteredTasks.length === 0) {
        column.innerHTML = `
            <div class="empty-state" style="padding: 20px; text-align: center; color: #5e6c84;">
                No tasks in this column
            </div>
        `;
        return;
    }
    
    column.innerHTML = filteredTasks.map(task => createTaskCard(task)).join('');
    
    // Add drag and drop event listeners to the newly rendered tasks
    document.querySelectorAll('.task-card').forEach(card => {
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragend', handleDragEnd);
        
        // Add click event to show task details
        card.addEventListener('click', (e) => {
            if (!e.target.classList.contains('delete-task-btn')) {
                openTaskDetails(card.dataset.taskId);
            }
        });
    });
    
    // Add delete button event listeners
    document.querySelectorAll('.delete-task-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const taskId = btn.closest('.task-card').dataset.taskId;
            deleteTask(taskId);
        });
    });
}

// Create task card HTML
function createTaskCard(task) {
    const priorityClass = `priority-${task.priority}`;
    const priorityLabels = {
        'low': 'Low',
        'medium': 'Medium',
        'high': 'High',
        'critical': 'Critical'
    };
    
    // Format the date
    const updatedAt = new Date(task.updatedAt);
    const formattedDate = updatedAt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
    
    return `
        <div class="task-card ${priorityClass} group relative" data-task-id="${task.id}" draggable="true">
            <div class="flex justify-between items-start">
                <div class="font-medium text-gray-900 text-sm pr-4">${escapeHtml(task.title)}</div>
                <button class="delete-task-btn opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <div class="mt-2 flex items-center justify-between">
                <div class="flex items-center space-x-2">
                    <span class="priority-badge ${priorityClass}">
                        <i class="fas fa-${task.priority === 'high' || task.priority === 'critical' ? 'exclamation' : 'circle'} mr-1"></i>
                        ${priorityLabels[task.priority] || task.priority}
                    </span>
                    
                    ${task.assignee ? `
                        <div class="flex items-center">
                            <span class="w-5 h-5 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-medium">
                                ${task.assignee.charAt(0).toUpperCase()}
                            </span>
                            <span class="ml-1 text-xs text-gray-500">${escapeHtml(task.assignee)}</span>
                        </div>
                    ` : ''}
                </div>
                
                <span class="text-xs text-gray-400">${formattedDate}</span>
            </div>
        </div>
    `;
}

// Update task counts for each column
function updateTaskCounts() {
    statusColumns.forEach(status => {
        const count = tasks.filter(task => task.status === status).length;
        const countElement = document.getElementById(`${status}-count`);
        if (countElement) {
            countElement.textContent = count;
        }
    });
}

// Delete a task
function deleteTask(taskId, modalToClose = null) {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    // Find the task element for animation
    const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
    if (taskElement) {
        // Animate the task removal
        taskElement.style.transition = 'all 0.3s ease';
        taskElement.style.opacity = '0';
        taskElement.style.transform = 'translateX(-100%)';
        
        // Remove the task after the animation completes
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderAllTasks();
        }, 300);
    } else {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderAllTasks();
    }
    
    // Close the modal if one was provided
    if (modalToClose) {
        modalToClose.remove();
    }
}

// Open task details in a modal
function openTaskDetails(taskId) {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Format the date
    const updatedAt = new Date(task.updatedAt);
    const formattedDate = updatedAt.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // Create and show the task details modal
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50';
    modal.style.backdropFilter = 'blur(2px)';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div class="p-6">
                <div class="flex justify-between items-start">
                    <h2 class="text-2xl font-bold text-gray-900 mb-4">${escapeHtml(task.title)}</h2>
                    <button onclick="this.closest('.fixed').remove()" class="text-gray-400 hover:text-gray-500">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="md:col-span-2 space-y-6">
                        <div>
                            <h3 class="text-sm font-medium text-gray-500 mb-2">Description</h3>
                            <p class="text-gray-700 whitespace-pre-line">${task.description || 'No description provided.'}</p>
                        </div>
                        
                        <div class="border-t border-gray-200 pt-4">
                            <h3 class="text-sm font-medium text-gray-500 mb-3">Activity</h3>
                            <div class="space-y-4">
                                <div class="flex items-start">
                                    <div class="flex-shrink-0 mt-1">
                                        <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                                            ${task.assignee ? task.assignee.charAt(0).toUpperCase() : '?'}
                                        </div>
                                    </div>
                                    <div class="ml-3">
                                        <p class="text-sm text-gray-900">
                                            <span class="font-medium">${task.assignee || 'Unknown'}</span> created this task
                                        </p>
                                        <p class="text-xs text-gray-500">${formattedDate}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="space-y-4">
                        <div>
                            <h3 class="text-sm font-medium text-gray-500 mb-2">Status</h3>
                            <div class="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                                ${task.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="text-sm font-medium text-gray-500 mb-2">Priority</h3>
                            <span class="priority-badge ${'priority-' + task.priority} inline-flex items-center">
                                <i class="fas fa-${task.priority === 'high' || task.priority === 'critical' ? 'exclamation' : 'circle'} mr-1"></i>
                                ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                            </span>
                        </div>
                        
                        <div>
                            <h3 class="text-sm font-medium text-gray-500 mb-2">Assignee</h3>
                            <div class="flex items-center">
                                <div class="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium">
                                    ${task.assignee ? task.assignee.charAt(0).toUpperCase() : '?'}
                                </div>
                                <span class="ml-2 text-gray-900">${task.assignee || 'Unassigned'}</span>
                            </div>
                        </div>
                        
                        <div>
                            <h3 class="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
                            <p class="text-sm text-gray-900">${formattedDate}</p>
                        </div>
                        
                        <div class="pt-4 border-t border-gray-200">
                            <button onclick="deleteTask('${task.id}', this.closest('.fixed'))" class="w-full flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                                <i class="fas fa-trash-alt mr-2"></i>
                                Delete Task
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Add the modal to the page
    document.body.appendChild(modal);
    
    // Close the modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    // Focus the close button for better keyboard navigation
    modal.querySelector('button').focus();
}

// Drag and Drop Functions
function handleDragStart(e) {
    draggedTask = this;
    const taskId = this.dataset.taskId;
    
    // Add visual feedback for the dragged item
    this.classList.add('opacity-50', 'shadow-xl', 'ring-2', 'ring-blue-400', 'scale-95');
    
    // Set the drag image to be a clone of the task card
    const dragImage = this.cloneNode(true);
    dragImage.classList.add('fixed', 'pointer-events-none', 'z-50', 'w-64', 'shadow-2xl', 'scale-110');
    document.body.appendChild(dragImage);
    
    // Position the drag image at the cursor position
    const rect = this.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    e.dataTransfer.setDragImage(dragImage, x, y);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    
    // Add a class to the body to change the cursor
    document.body.classList.add('cursor-grabbing');
    
    // Remove the temporary drag image after a short delay
    setTimeout(() => {
        if (document.body.contains(dragImage)) {
            document.body.removeChild(dragImage);
        }
    }, 0);
    
    // Add a class to all potential drop targets
    document.querySelectorAll('.board-column').forEach(column => {
        if (column !== this.closest('.board-column')) {
            column.classList.add('opacity-75');
        }
    });
}

function handleDragEnd() {
    this.classList.remove('opacity-50', 'shadow-xl', 'ring-2', 'ring-blue-400', 'scale-95');
    document.body.classList.remove('cursor-grabbing');
    
    // Remove opacity from all columns
    document.querySelectorAll('.board-column').forEach(column => {
        column.classList.remove('opacity-75');
    });
    
    // Remove any remaining drag images
    document.querySelectorAll('.drag-ghost').forEach(el => el.remove());
}

function allowDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    
    // Add a visual indicator when dragging over a valid drop target
    const targetColumn = e.target.closest('.board-column');
    if (targetColumn) {
        // Highlight the column
        if (!targetColumn.classList.contains('border-blue-400')) {
            targetColumn.classList.add('border-blue-400', 'bg-blue-50');
            
            // Create a drop indicator
            let dropIndicator = targetColumn.querySelector('.drop-indicator');
            if (!dropIndicator) {
                dropIndicator = document.createElement('div');
                dropIndicator.className = 'drop-indicator h-1 bg-blue-400 rounded-full mx-2 my-1 opacity-0 transition-opacity duration-200';
                targetColumn.querySelector('.tasks').appendChild(dropIndicator);
            }
            
            // Position the drop indicator based on mouse position
            const tasksContainer = targetColumn.querySelector('.tasks');
            const tasks = Array.from(tasksContainer.children).filter(el => !el.classList.contains('drop-indicator'));
            const rect = tasksContainer.getBoundingClientRect();
            const y = e.clientY - rect.top;
            
            // Find the task that the mouse is over
            let closestTask = null;
            let closestDistance = Infinity;
            
            tasks.forEach(task => {
                const taskRect = task.getBoundingClientRect();
                const taskMiddle = taskRect.top + taskRect.height / 2 - rect.top;
                const distance = Math.abs(y - taskMiddle);
                
                if (distance < closestDistance) {
                    closestDistance = distance;
                    closestTask = task;
                }
            });
            
            // Position the drop indicator
            if (closestTask) {
                const taskRect = closestTask.getBoundingClientRect();
                const taskMiddle = taskRect.top + taskRect.height / 2 - rect.top;
                
                if (y > taskMiddle) {
                    // Insert after the task
                    dropIndicator.style.marginTop = `${taskRect.bottom - rect.top}px`;
                    dropIndicator.style.marginBottom = `-${taskRect.bottom - rect.top}px`;
                } else {
                    // Insert before the task
                    dropIndicator.style.marginTop = `${taskRect.top - rect.top}px`;
                    dropIndicator.style.marginBottom = `-${taskRect.top - rect.top}px`;
                }
            } else {
                // If no tasks or at the end
                dropIndicator.style.marginTop = '0';
                dropIndicator.style.marginBottom = '0';
            }
            
            // Show the drop indicator
            dropIndicator.classList.remove('opacity-0');
            dropIndicator.classList.add('opacity-100');
        }
        
        // Remove the highlight when leaving the column
        const leaveHandler = () => {
            targetColumn.classList.remove('border-blue-400', 'bg-blue-50');
            const dropIndicator = targetColumn.querySelector('.drop-indicator');
            if (dropIndicator) {
                dropIndicator.classList.remove('opacity-100');
                dropIndicator.classList.add('opacity-0');
            }
            targetColumn.removeEventListener('dragleave', leaveHandler);
            targetColumn.removeEventListener('drop', leaveHandler);
        };
        
        targetColumn.addEventListener('dragleave', leaveHandler);
        targetColumn.addEventListener('drop', leaveHandler);
    }
}

function drop(e) {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedTask) return;
    
    // Get the target column and task ID
    const targetColumn = e.target.closest('.board-column');
    if (!targetColumn) return;
    
    const newStatus = targetColumn.dataset.status;
    const taskId = draggedTask.dataset.taskId;
    
    // Remove the drop indicator
    const dropIndicator = targetColumn.querySelector('.drop-indicator');
    if (dropIndicator) {
        dropIndicator.remove();
    }
    
    // Update the task status with animation
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1 && tasks[taskIndex].status !== newStatus) {
        // Get the position to insert the task
        const tasksContainer = targetColumn.querySelector('.tasks');
        const tasksList = Array.from(tasksContainer.children).filter(el => !el.classList.contains('drop-indicator'));
        let insertPosition = null;
        
        if (dropIndicator) {
            const dropY = parseInt(dropIndicator.style.marginTop || '0') + 4; // Add a small offset
            
            // Find the task to insert before/after
            for (let i = 0; i < tasksList.length; i++) {
                const task = tasksList[i];
                const taskRect = task.getBoundingClientRect();
                const taskY = taskRect.top + taskRect.height / 2 - tasksContainer.getBoundingClientRect().top;
                
                if (dropY < taskY) {
                    insertPosition = i;
                    break;
                }
            }
            
            // If we didn't find a position, append to the end
            if (insertPosition === null) {
                insertPosition = tasksList.length;
            }
        }
        
        // Update the task status
        tasks[taskIndex].status = newStatus;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        saveTasks();
        
        // Animate the task to its new position
        const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
        if (taskElement) {
            // Create a clone for the animation
            const clone = taskElement.cloneNode(true);
            const rect = taskElement.getBoundingClientRect();
            
            // Position the clone exactly where the original is
            clone.style.position = 'fixed';
            clone.style.top = `${rect.top}px`;
            clone.style.left = `${rect.left}px`;
            clone.style.width = `${rect.width}px`;
            clone.style.height = `${rect.height}px`;
            clone.style.zIndex = '100';
            clone.style.pointerEvents = 'none';
            clone.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
            clone.style.transform = 'none';
            
            // Add the clone to the body
            document.body.appendChild(clone);
            
            // Force a reflow to ensure the clone is rendered
            void clone.offsetHeight;
            
            // Get the target position
            const targetRect = targetColumn.getBoundingClientRect();
            const targetTasks = Array.from(targetColumn.querySelector('.tasks').children).filter(el => !el.classList.contains('drop-indicator'));
            let targetY = targetRect.top + 50; // Default to top of the column
            
            if (insertPosition !== null && insertPosition < targetTasks.length) {
                // Insert before an existing task
                const targetTask = targetTasks[insertPosition];
                const targetTaskRect = targetTask.getBoundingClientRect();
                targetY = targetTaskRect.top;
            } else if (targetTasks.length > 0) {
                // Append to the end
                const lastTask = targetTasks[targetTasks.length - 1];
                const lastTaskRect = lastTask.getBoundingClientRect();
                targetY = lastTaskRect.bottom + 8; // Add some spacing
            }
            
            // Animate to the target position
            clone.style.transform = `translate(${targetRect.left - rect.left}px, ${targetY - rect.top}px) scale(0.95)`;
            clone.style.opacity = '0.8';
            
            // Remove the original element
            taskElement.style.visibility = 'hidden';
            
            // After animation completes, update the UI and clean up
            setTimeout(() => {
                clone.remove();
                renderAllTasks();
            }, 300);
        } else {
            renderAllTasks();
        }
    }
    
    // Reset the dragged task
    draggedTask = null;
}

// Helper function to escape HTML
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Add drag and drop event listeners to columns
document.addEventListener('DOMContentLoaded', () => {
    // Initialize the app
    init();
    
    // Add drag and drop event listeners to columns
    document.querySelectorAll('.tasks').forEach(column => {
        column.addEventListener('dragover', allowDrop);
        column.addEventListener('drop', drop);
    });
    
    // Add keyboard shortcut (Ctrl+Enter) to submit the form
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter' && taskModal.style.display === 'flex') {
            handleTaskSubmit(e);
        }
    });
});

// Make functions available globally for inline event handlers
window.openAddTaskModal = openAddTaskModal;
window.closeTaskModal = closeTaskModal;
