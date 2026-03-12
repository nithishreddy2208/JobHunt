import mongoose from 'mongoose'

const userSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,
        required:true
    },
    phoneNumber:{
        type:Number,
        required:true
    },
    role:{
        type:String,
        enum:['recruiter','jobSeeker'],
        required:true
    },
    profile:{
        bio:{
            type:String,
            default:""
        },
        skills:{
            type:[String],
            default:[]
        },
        resume:{
            type:String,
            default:""
        },
        resumeName:{
            type:String,
            default:""
        },
        company:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Company',
            default:null
        },
        photo:{
            type:String,
            default:""
        }
    }
},{timestamps:true});

export const User = mongoose.model('User',userSchema);