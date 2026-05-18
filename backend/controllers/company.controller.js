import { Company } from '../models/company.model.js'
import { ReadModels } from '../db/index.js';

export const registerCompany = async (req, res) => {
    try {
        const created_by = req.userId;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                message: "Company name is required",
                success: false
            });
        }
        let company = await Company.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
        if (company) {
            return res.status(409).json({
                message: "Company with that name already exists",
                success: false
            })
        }

        company = await Company.create({
            name,
            created_by
        })
        return res.status(201).json({
            message: "Company created successfully",
            company,
            success: true
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}
export const getCompany = async (req, res) => {
    try {
        const created_by = req.userId;
        // List read -> replica.
        const companies = await ReadModels.Company.find({ created_by }).lean();

        if (companies.length === 0) {
            return res.status(404).json({
                message: "Companies not found",
                success: false
            })
        }

        return res.status(200).json({
            companies,
            success: true
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}
export const getCompanyById = async (req, res) => {
    try {
        const companyId = req.params.id;
        // Detail read -> replica.
        const company = await ReadModels.Company.findById(companyId).lean();
        if (!company) {
            return res.status(404).json({
                message: "Not found",
                success: false
            })
        }
        return res.status(200).json({
            company,
            success: true
        })
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}
export const updateCompanyById = async (req, res) => {
    try {
        const companyId = req.params.id;
        const { name, description, logo, location, website } = req.body;
        const userId = req.userId;

        const company = await Company.findById(companyId);
        if (!company) {
            return res.status(404).json({
                message: "Company not found",
                success: false
            });
        }
        if (company.created_by.toString() !== userId) {
            return res.status(403).json({
                message: "Access denied,only the creator can update",
                success: false
            });
        }
        if (name) {
            const existingCompany = await Company.findOne({ name: { $regex: `^${name}$`, $options: "i" } });
            if (existingCompany && existingCompany._id.toString() !== companyId) {
                return res.status(409).json({
                    message: "Company name already in use",
                    success: false
                });
            }
            company.name = name;
        }

        if (description) company.description = description;
        if (logo) company.logo = logo;
        if (location) company.location = location;
        if (website) company.website = website;

        await company.save();
        return res.status(200).json({
            message: "Company details updated successfully",
            success: true,
            company
        });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({
            message: "Internal server error",
            success: false
        })
    }
}
