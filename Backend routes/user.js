import { RegisterURL ,LoginURL , LogOutURL} from "./constant.js";
import { notify } from "../utils/toast.js";
import { removeItem } from "../utils/localstorage.js";


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
            credentials: "include", 
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

const logoutUser = async ()=>{
    try {
        const response = await fetch(LogOutURL,{
            method:"POST",
            credentials: "include",
        })

        const data = await response.json();
        console.log(data);
        
        if(!data.success){
            notify(data.message , "error");
        }else{
            removeItem("CURRENT-USER");
            notify(data.message , "success","../index.html");
        }

    } catch (error) {
      notify(error.message , "error");   
    }
}

export  {
 registerUser,
 loginUser,
 logoutUser,
}