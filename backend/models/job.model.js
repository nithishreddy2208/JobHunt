import mongoose from 'mongoose';

const jobSchema=mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    location:{
        type:String,
        required:true
    },
    salary:{
        type:Number,
        required:true
    },
    experienceLevel:{
        type:String,
        required:true
    },
    requirements:[{
        type:String
    }],
    jobType:{
        type:String,
        required:true
    },
    positions:{
        type:Number,
        required:true
    },
    company:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Company',
        required:true
    },
    created_by:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    applications:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Application'
    }]
},{ timestamps: true })

jobSchema.index({ createdAt: -1 });
jobSchema.index({ created_by: 1, createdAt: -1 });
jobSchema.index({ jobType: 1, createdAt: -1 });
jobSchema.index({ location: 1 }); 
jobSchema.index({ location: 1, jobType: 1, createdAt: -1 }); 
jobSchema.index({ title: "text", description: "text" });

export const Job=mongoose.model('Job',jobSchema);