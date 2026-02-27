import { notify } from "../utils/toast.js";
import { createNewGoalsURL, goalsTrackerCardsURL , updateMilestoneURL } from "./constant.js";

const createGoalsTracker = async (payload)=>{
    try {
        // console.log(payload);
        const response = await fetch(createNewGoalsURL , {
            method:"POST",
            credentials: "include", 
            headers:{
                "Content-Type" :"application/json",
            },
            body: JSON.stringify(payload),
        })
        
        

        const data = await response.json();
        return data;

    } catch (error) {
        notify(error.message , "error");   
    }
}


const getGoalsCard = async ()=>{
    try {
        const response = await fetch(goalsTrackerCardsURL ,{
            method:"GET",
            credentials:"include",
        })

        const data = await response.json();
        return data;
    } catch (error) {
        notify(error.message , "error"); 
    }
}

const updateMilestone = async (goalId, milestoneId, checked)=>{
    try {
        const response = await fetch(updateMilestoneURL ,{
            method:"PUT",
            credentials:"include",
            headers:{
                "Content-Type" :"application/json",
            },
            body: JSON.stringify({goalId, milestoneId, completed:checked}),
        })

        if (!response.ok) {
            notify("Failed to update milestone" , "error");
        }

        const data = await response.json();
        return data;
    } catch (error) {
        notify(error.message , "error");
    }
}


export {
    createGoalsTracker,
    getGoalsCard,
    updateMilestone,
}