import type { Request, Response, NextFunction } from 'express';
import * as adminService from './admin.service.js';

export async function listCompanies(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const companies = await adminService.listCompanies();
    res.json(companies);
  } catch (err) {
    next(err);
  }
}

export async function createCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await adminService.createCompany(req.user!, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateCompanyStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const company = await adminService.updateCompanyStatus(
      String(req.params.id),
      req.body,
    );
    res.json(company);
  } catch (err) {
    next(err);
  }
}

export async function updateCompany(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const company = await adminService.updateCompany(
      String(req.params.id),
      req.body,
    );
    res.json(company);
  } catch (err) {
    next(err);
  }
}

export async function dashboardStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await adminService.getDashboardStats(req.user!);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

export async function listContracts(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contracts = await adminService.listContracts(req.query);
    res.json(contracts);
  } catch (err) {
    next(err);
  }
}

export async function createContract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contract = await adminService.createContract(req.user!, req.body);
    res.status(201).json(contract);
  } catch (err) {
    next(err);
  }
}

export async function updateContract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contract = await adminService.updateContract(String(req.params.id), req.body);
    res.json(contract);
  } catch (err) {
    next(err);
  }
}

export async function getContract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const data = await adminService.getContract(String(req.params.id));
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function renewContract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const contract = await adminService.renewContract(
      req.user!,
      String(req.params.id),
      req.body,
    );
    res.json(contract);
  } catch (err) {
    next(err);
  }
}

export async function deleteContract(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await adminService.deleteContract(String(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
