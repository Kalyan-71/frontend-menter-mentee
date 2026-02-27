import { createGoalsTracker, getGoalsCard, updateMilestone } from "../Backend routes/goalsTracker.js";
import { notify } from "../utils/toast.js";



function goToDashboard() {
    window.location.href = '../dashboard/dashboard.html';
}

function goToProfile() {
    window.location.href = '../profile/profile.html';
}

function goToMessages() {
    window.location.href = '../messages/messages.html';
}

function openNewGoalModal() {
    document.getElementById('newGoalModal').classList.add('active');
}

function closeNewGoalModal() {
    document.getElementById('newGoalModal').classList.remove('active');
}

// Close modal when clicking outside
document.getElementById('newGoalModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeNewGoalModal();
    }
});



function addMilestoneInput() {
  const container = document.getElementById("milestoneContainer");
  const count = container.children.length + 1;

  const input = document.createElement("input");
  input.type = "text";
  input.className = "form-input milestone-input";
  input.placeholder = "Milestone " + count;

  container.appendChild(input);
}


////////////////////////////////////////////////////////////rendering


let allGoals = [];

async function createGoal() {
    
  const title = document.getElementById("goalTitle").value;
  const category = document.getElementById("goalCategory").value;
  const description = document.getElementById("goalDescription").value;
  const targetDate = document.getElementById("goalDate").value;

  const milestoneInputs = document.querySelectorAll(".milestone-input");

    if (!title || !category || !description) {
        notify("Title, Category, and Description are required" ,"error" );
        return;
    }

    const milestones = [];
    for (let input of milestoneInputs) {
        const value = input.value.trim();
        if (value === "") {
            notify("Milestone cannot be empty","error");
            input.focus();
            return;
        }
        milestones.push({
            todo: value,
            isCompleted: false
        });
    }

  const payload = {
    title,
    category,
    description,
    targetDate: targetDate || null,
    milestones
  };

  const res = await createGoalsTracker(payload);///backend call and its result
    if(res.success){
        allGoals.unshift(res.data);
        console.log(allGoals)
        renderGoals(allGoals);
        notify("Goal created successfully!", "success");
        closeNewGoalModal();
    }
}






async function loadGoals(){
    allGoals = await getGoalsCard();
    renderGoals(allGoals);
}

function renderGoals(goals){
    
    const container = document.getElementById("goalsGrid");
    container.innerHTML="";

    goals.forEach(goal=>{
        const completedCount = goal.milestones.filter(m => m.isCompleted).length;//[].length
        const total = goal.milestones.length;
        const percentage = total===0? 0 : Math.round((completedCount/total)*100);


        const milestoneHTML = goal.milestones.map(m=>`
                    <div class="milestone-item">
                        <input type="checkbox" class="milestone-checkbox" 
                        ${m.isCompleted ? "checked":""} 
                        onchange="toggleMilestone('${goal._id}','${m._id}', this.checked)">
                        <span class="milestone-text ${m.isCompleted?"completed":" "} ">
                        ${m.todo}
                        </span>
                    </div>`).join("");


        container.innerHTML += `
            <div class="goal-card ${percentage === 100? "completed" : ""}">
                <div class="goal-header">
                    <div>
                        <span class="goal-category">${goal.category}</span>
                        <h3 class="goal-title">${goal.title}</h3>
                    </div>
                </div>
                <p class="goal-description">${goal.description}</p>
                
                <div class="goal-progress">
                    <div class="progress-header">
                        <span class="progress-label">Overall Progress</span>
                        <span class="progress-percentage">${percentage}%</span>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width:${percentage}%"></div>
                    </div>
                </div>

                <div class="goal-milestones">
                    <div class="milestone-title">Milestones:</div>
                    ${milestoneHTML}
                </div>

                <div class="goal-footer">
                    <span class="goal-deadline">
                    📅 ${goal.targetDate ? new Date(goal.targetDate).toDateString() : "No target date"}
                    </span>
                    <div class="goal-actions">
                        <button class="btn-action">Edit</button>
                        <button class="btn-action btn-complete">Mark Complete</button>
                    </div>
                </div>
            </div>
        `
    })     
}


function filterGoals(type) {
  document.querySelectorAll(".tab-btn").forEach(btn => btn.classList.remove("active"));
  event.target.classList.add("active");

  let filtered = allGoals;

  if (type === "active") {
    filtered = allGoals.filter(goal =>
      goal.milestones.some(m => !m.isCompleted)
    );
  }

  else if (type === "completed") {
    filtered = allGoals.filter(goal =>
      goal.milestones.length > 0 &&
      goal.milestones.every(m => m.isCompleted)
    );
  }

  else if (type !== "all") {
    filtered = allGoals.filter(goal =>
      goal.category.toLowerCase() === type.toLowerCase()
    );
  }

  renderGoals(filtered);
}

async function toggleMilestone(goalId, milestoneId, checked) {
  // update backend
  await updateMilestone(goalId, milestoneId, checked);

  // update frontend state
  const goal = allGoals.find(g => g._id === goalId);
  const milestone = goal.milestones.find(m => m._id === milestoneId);
  milestone.isCompleted = checked;
  renderGoals(allGoals);
}


window.onload = loadGoals;
window.addMilestoneInput = addMilestoneInput;
window.goToDashboard = goToDashboard;
window.goToProfile = goToProfile;
window.goToMessages = goToMessages;
window.openNewGoalModal = openNewGoalModal;
window.closeNewGoalModal = closeNewGoalModal;
window.createGoal = createGoal;
window.filterGoals = filterGoals;
window.toggleMilestone = toggleMilestone;



