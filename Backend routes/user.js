import { RegisterURL ,LoginURL} from "./constant.js";
import { notify } from "../utils/toast.js";


const registerUser = async({
    fullName,
    email,
    password,
    username,
    role })=>{

    const user = {"fullname":fullName , email , password, username,role};
   
    try {
        const response = await fetch(RegisterURL,{
            method:"POST",
            headers:{
                "Content-Type":"application/json",
            },
            body:JSON.stringify(user),
        });
        
        const data = await response.json();
        return data;

    } catch (error) {
        notify(error.message , "error");
    }

}


const loginUser = async ({email , password}) => {
    try {
        const response = await fetch(LoginURL , {
            method:"POST",
            headers:{
                "Content-Type" :"application/json",
            },
            body: JSON.stringify({email , password}),
        })

        const data = await response.json();
        return data;

    } catch (error) {
        notify(error.message , "error");
    }
}


export  {
 registerUser,
 loginUser,
}