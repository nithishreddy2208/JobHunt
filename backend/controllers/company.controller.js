import { Company } from '../models/company.model.js'

export const registerCompany = async (req, res) => {
    try {
        const createdBy = req.userId;
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({
                message: "Company name is required",
                success: false
            });
        }
        let company = await Company.findOne({ name });
        if (company) {
            return res.status(409).json({
                message: "Company with that name already exists",
                success: false
            })
        }

        company = await Company.create({
            name,
            createdBy
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
        const createdBy = req.userId;
        const companies = await Company.find({ createdBy });

        if (!companies) {
            return res.status(404).json({
                message: "Not found",
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
        const company = await Company.findById(companyId);
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
        if (company.createdBy.toString() !== userId) {
            return res.status(403).json({
                message: "Access denied,only the creator can update",
                success: false
            });
        }
        if (name) {
            const existingCompany = await Company.findOne({ name });
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
