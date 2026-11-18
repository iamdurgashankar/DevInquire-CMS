import React, { useState, useMemo, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  Download,
  Play,
  CheckCircle2,
  AlertTriangle,
  Link as LinkIcon,
  Layers,
  FileText,
  Sparkles,
  ExternalLink,
  Edit3,
  Monitor,
  RefreshCw,
  Code,
  ArrowRight,
  FolderTree,
  Check,
  Copy,
  Trash2,
  Eye,
  GitBranch,
  Repeat
} from 'lucide-react';
import { Page, Section, Block, URLRewrite, GlobalStyles } from '../types';
import { ensurePageBaselineVersion, appendPageVersion } from './VersionHistoryModal';
import { toast } from 'sonner';

interface CsvPageAutomationProps {
  pages: Page[];
  setPages: React.Dispatch<React.SetStateAction<Page[]>>;
  syncPage: (page: Page) => Promise<void>;
  rewrites: URLRewrite[];
  setRewrites: React.Dispatch<React.SetStateAction<URLRewrite[]>>;
  syncRewrite: (rewrite: URLRewrite) => Promise<void>;
  globalStyles: GlobalStyles;
  authorName: string;
  siteName: string;
  canManage: boolean;
  onOpenEditor: (pageId: string) => void;
  onOpenExperienceManager: (pageId: string) => void;
}

export interface ParsedComponentSpec {
  id: string;
  type: string;
  sectionLabel: string;
  heading: string;
  subheading: string;
  body: string;
  ctaLabel: string;
  linkToSlug: string;
  bgColor: string;
  items: string[];
  price?: string;
  planName?: string;
}

export interface ParsedPageBlueprint {
  rowIndices: number[];
  title: string;
  slug: string;
  parentSlug: string;
  status: 'draft' | 'published';
  metaTitle: string;
  metaDescription: string;
  keywords: string;
  rewriteFrom: string;
  linkTargets: string[];
  components: ParsedComponentSpec[];
  existingPageId?: string;
  validationWarnings: string[];
}

interface AutomationExecutionReport {
  timestamp: string;
  fileName: string;
  createdPages: Page[];
  updatedPages: Page[];
  skippedSlugs: string[];
  createdRewrites: URLRewrite[];
  totalComponentsCreated: number;
  totalLinksWired: number;
}

const SAMPLE_CSV_PRESETS: Record<
  string,
  {
    name: string;
    description: string;
    badge: string;
    csv: string;
  }
> = {
  saas_funnel: {
    name: 'Multi-Page SaaS Funnel (Page-per-Row)',
    description: 'Creates 5 interconnected SaaS pages (Platform, Solutions, Pricing, Enterprise, Contact) with Hero, Features, Pricing, FAQ, and linked CTAs.',
    badge: '5 Pages · 22 Components',
    csv: `title,slug,parent_slug,status,components,hero_heading,hero_subheading,body_content,cta_label,link_to,meta_title,meta_description,keywords,rewrite_from
"CloudScale Platform",platform,home,published,"nav|hero|features|counter|cta|sitemap","Next-Gen Cloud Infrastructure","Deploy globally distributed microservices with zero configuration and automated edge routing.","Built for engineering teams that demand sub-50ms latency, instant rollbacks, and automated compliance across 35+ edge regions.","Explore Pricing",pricing,"CloudScale Platform | Edge Cloud","Next-generation cloud platform with automated edge routing.","cloud, platform, edge, devops",/old-platform
"Enterprise Solutions",solutions,platform,published,"nav|hero|tabs|list|testimonial|cta","Tailored Solutions for High-Growth Teams","From fintech compliance to real-time AI inference pipelines, scale workloads effortlessly.","Our modular architecture adapts to multi-cloud governance, zero-trust networking, and dedicated VPC peering.","Compare Plans",pricing,"Solutions | CloudScale","Enterprise cloud solutions for regulated and high-scale workloads.","solutions, enterprise, vpc, security",/enterprise-solutions
"Transparent Pricing",pricing,platform,published,"nav|hero|pricing|accordion|cta","Predictable Usage-Based Pricing","Start free with generous developer tiers and scale seamlessly as your traffic grows.","Every plan includes automatic DDoS mitigation, global CDN caching, and 24/7 engineering support.","Talk to Enterprise Sales",enterprise,"Pricing | CloudScale","Simple, transparent pricing for developers and enterprise teams.","pricing, plans, billing, cloud cost",/rates
"Enterprise Security & SLA",enterprise,solutions,published,"nav|hero|list|counter|testimonial|cta","SOC2 Type II & HIPAA Ready Infrastructure","Dedicated hardware isolation, custom SLAs up to 99.999%, and 15-minute response times.","Partner with our solutions architects to design custom hybrid deployments and migration roadmaps.","Schedule Architecture Review",contact-sales,"Enterprise Security | CloudScale","Enterprise-grade compliance, dedicated clusters, and custom SLAs.","soc2, hipaa, enterprise, sla",/security
"Contact Sales & Demo",contact-sales,enterprise,published,"nav|hero|form|accordion|sitemap","Book a Live Architecture Walkthrough","Connect with our engineering specialists to benchmark your workload on CloudScale.","Fill out the form below and a principal solutions engineer will respond within 2 business hours.","Back to Platform Overview",platform,"Contact Sales | CloudScale","Request a custom demo and architecture review with CloudScale.","contact, demo, sales, consultation",/book-demo`
  },
  component_granularity: {
    name: 'Granular Component-by-Component Spec (Multi-Row per Page)',
    description: 'Multiple rows per page slug assemble custom ordered sections (Hero, Stats, Feature List, Pricing Tiers, Lead Form) with cross-page links.',
    badge: '3 Pages · 12 Custom Sections',
    csv: `title,slug,parent_slug,status,component_type,section_name,hero_heading,hero_subheading,body_content,cta_label,link_to,items,bg_color,meta_title,meta_description
"AI Analytics Suite",ai-analytics,home,published,nav,"Top Navigation","AI Analytics","","","","ai-workflows|ai-pricing","","ffffff","AI Analytics Suite","Real-time predictive intelligence for product teams."
"AI Analytics Suite",ai-analytics,home,published,hero,"Hero Banner","Predictive Product Intelligence","Turn raw event streams into automated revenue forecasts in minutes.","Connect your data warehouse in one click and surface retention anomalies before they impact ARR.","Explore Automated Workflows",ai-workflows,"","f8fafc","AI Analytics Suite","Real-time predictive intelligence for product teams."
"AI Analytics Suite",ai-analytics,home,published,counter,"Key Metrics","99.4%","Forecast Accuracy","Validated across 1.2B daily user events","","","99.4%|Forecast Accuracy","ffffff","",""
"AI Analytics Suite",ai-analytics,home,published,list,"Core Capabilities","Why Data Teams Switch","Automated schema discovery and natural-language SQL generation.","","See Workflow Templates",ai-workflows,"Zero-ETL warehouse sync in under 60 seconds|Automated cohort retention alerts in Slack|Self-healing funnel definitions|Role-based PII masking by default","ffffff","",""
"Automated Workflows",ai-workflows,ai-analytics,published,nav,"Top Navigation","AI Analytics","","","","ai-analytics|ai-pricing","","ffffff","Automated Workflows | AI Analytics","Trigger automated lifecycle actions from real-time product signals."
"Automated Workflows",ai-workflows,ai-analytics,published,hero,"Workflow Hero","From Insight to Action Automatically","Trigger webhooks, CRM updates, and in-app nudges the moment user intent spikes.","Orchestrate multi-step playbooks visually or sync directly via UTF-8 CSV and REST webhooks.","View Suite Pricing",ai-pricing,"","f0f9ff","Automated Workflows | AI Analytics","Trigger automated lifecycle actions from real-time product signals."
"Automated Workflows",ai-workflows,ai-analytics,published,tabs,"Playbook Library","Pre-Built Automation Playbooks","","","","","Churn Prevention|Detect 7-day inactivity drops and trigger personalized onboarding check-ins.;Expansion Signals|Alert account executives when workspace seat utilization crosses 85%.;Onboarding Velocity|Measure time-to-first-value across every signup channel.","ffffff","",""
"Automated Workflows",ai-workflows,ai-analytics,published,testimonial,"Customer Proof","Reduced our analytics engineering backlog by 70% in the first month.","Elena Rostova · VP of Data at FinPulse","","","","","ffffff","",""
"Analytics Pricing & Tiers",ai-pricing,ai-analytics,published,nav,"Top Navigation","AI Analytics","","","","ai-analytics|ai-workflows","","ffffff","AI Analytics Pricing","Flexible plans for startups and enterprise data teams."
"Analytics Pricing & Tiers",ai-pricing,ai-analytics,published,hero,"Pricing Header","Scale With Your Event Volume","Transparent monthly tiers with unlimited seats and zero overage penalties.","","Back to AI Analytics Hub",ai-analytics,"","f8fafc","AI Analytics Pricing","Flexible plans for startups and enterprise data teams."
"Analytics Pricing & Tiers",ai-pricing,ai-analytics,published,pricing,"Growth Tier","Growth Plan","$149","per month","Start With Growth",ai-analytics,"Up to 10M monthly tracked events|Unlimited dashboard seats|Automated Slack & Webhook alerts|SOC2 Type II compliance","ffffff","",""
"Analytics Pricing & Tiers",ai-pricing,ai-analytics,published,form,"Custom Quote Request","Need Custom Event Volume?","Tell us about your data stack and we will build a tailored enterprise quote.","Request Custom Quote",ai-analytics,"Full Name:text:true|Work Email:email:true|Monthly Event Volume:text:true|Data Stack Notes:textarea:false","f8fafc","",""`
  },
  documentation_hub: {
    name: 'Documentation & Knowledge Base Hierarchy',
    description: 'Generates a parent Documentation Hub linked to Getting Started, API Reference, and Webhooks guide pages with automatic breadcrumbs & sibling links.',
    badge: '4 Linked Docs Pages',
    csv: `title,slug,parent_slug,status,components,hero_heading,hero_subheading,body_content,cta_label,link_to,meta_title,meta_description,keywords,rewrite_from
"Developer Documentation Hub",docs-hub,home,published,"nav|hero|features|sitemap","Developer Documentation & Guides","Everything you need to integrate, automate, and scale with our headless CMS APIs.","Browse quickstarts, SDK references, and webhook security guides below.","Start 5-Minute Quickstart",docs-quickstart,"Developer Docs Hub","Official documentation, guides, and API references.","docs, api, sdk, developer",/documentation
"5-Minute Quickstart Guide",docs-quickstart,docs-hub,published,"nav|hero|list|alert|cta","Get Up and Running in 5 Minutes","Install the CLI, authenticate your workspace token, and deploy your first content model.","Follow the step-by-step checklist below to initialize your local project and sync schemas.","Explore REST API Reference",docs-api-reference,"Quickstart Guide | Docs","Learn how to initialize and deploy your project in 5 minutes.","quickstart, cli, setup, tutorial",/quickstart
"REST & GraphQL API Reference",docs-api-reference,docs-hub,published,"nav|hero|tabs|accordion|cta","Complete Headless API Reference","Query collections, pages, and media assets from any frontend framework with edge caching.","All endpoints return UTF-8 JSON responses with deterministic pagination and ETag support.","Configure Real-Time Webhooks",docs-webhooks,"API Reference | Docs","Complete REST and GraphQL endpoint documentation.","api, rest, graphql, endpoints",/api-docs
"Webhooks & Event Automation",docs-webhooks,docs-hub,published,"nav|hero|list|form|cta","Real-Time Webhooks & Event Streams","Subscribe to page.published, collection.updated, and media.uploaded lifecycle events.","Verify HMAC-SHA256 signatures on incoming payloads and automate downstream CI/CD builds.","Return to Documentation Hub",docs-hub,"Webhooks Guide | Docs","Configure real-time webhooks and HMAC verification.","webhooks, events, automation, cicd",/webhooks-guide`
  }
};

/**
 * RFC 4180 compliant UTF-8 CSV parser with BOM stripping and header normalization
 */
export function parseUtf8Csv(rawText: string): { headers: string[]; rows: Record<string, string>[] } {
  // Strip UTF-8 BOM if present
  const cleaned = rawText.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const records: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    const nextCh = cleaned[i + 1];

    if (inQuotes) {
      if (ch === '"' && nextCh === '"') {
        currentCell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        currentCell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (ch === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          records.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += ch;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell.length > 0)) {
      records.push(currentRow);
    }
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const rawHeaders = records[0].map(h =>
    h
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );

  const rows: Record<string, string>[] = [];
  for (let r = 1; r < records.length; r++) {
    const values = records[r];
    const rowObj: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      if (h) {
        rowObj[h] = values[idx] !== undefined ? values[idx] : '';
      }
    });
    rows.push(rowObj);
  }

  return { headers: rawHeaders, rows };
}

function normalizeSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function pickField(row: Record<string, string>, candidates: string[], fallback = ''): string {
  for (const key of candidates) {
    if (row[key] !== undefined && row[key].trim() !== '') {
      return row[key].trim();
    }
  }
  return fallback;
}

export const CsvPageAutomation: React.FC<CsvPageAutomationProps> = ({
  pages,
  setPages,
  syncPage,
  rewrites,
  setRewrites,
  syncRewrite,
  globalStyles,
  authorName,
  siteName,
  canManage,
  onOpenEditor,
  onOpenExperienceManager
}) => {
  const [csvText, setCsvText] = useState<string>(SAMPLE_CSV_PRESETS.saas_funnel.csv);
  const [fileName, setFileName] = useState<string>('saas-funnel-utf8.csv');
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('saas_funnel');
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [conflictStrategy, setConflictStrategy] = useState<'update' | 'skip' | 'duplicate'>('update');
  const [autoInjectNavHeader, setAutoInjectNavHeader] = useState<boolean>(true);
  const [autoInjectRelatedLinksSection, setAutoInjectRelatedLinksSection] = useState<boolean>(true);
  const [autoCreateUrlRewrites, setAutoCreateUrlRewrites] = useState<boolean>(true);
  const [defaultStatusOverride, setDefaultStatusOverride] = useState<'from_csv' | 'published' | 'draft'>('from_csv');
  const [isRunningAutomation, setIsRunningAutomation] = useState<boolean>(false);
  const [executionReport, setExecutionReport] = useState<AutomationExecutionReport | null>(null);
  const [previewSelectedSlug, setPreviewSelectedSlug] = useState<string | null>(null);
  const [showRawCsvEditor, setShowRawCsvEditor] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse CSV & build structured page blueprints + inter-page link graph
  const parsedResult = useMemo(() => {
    const { headers, rows } = parseUtf8Csv(csvText);
    const blueprintMap = new Map<string, ParsedPageBlueprint>();
    const parseErrors: string[] = [];

    if (headers.length === 0) {
      return { headers, rows, blueprints: [], parseErrors: ['CSV is empty or missing a header row.'], linkEdges: [] };
    }

    rows.forEach((row, idx) => {
      const rowNum = idx + 2; // 1-based including header
      const rawTitle = pickField(row, ['title', 'page_title', 'name', 'page_name']);
      const rawSlug = pickField(row, ['slug', 'page_slug', 'url', 'path', 'route'], rawTitle ? normalizeSlug(rawTitle) : '');
      const slug = normalizeSlug(rawSlug);

      if (!slug) {
        parseErrors.push(`Row ${rowNum}: Missing both "slug" and "title" — row skipped.`);
        return;
      }

      const title = rawTitle || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const parentSlug = normalizeSlug(pickField(row, ['parent_slug', 'parent', 'parent_page']));
      const rawStatus = pickField(row, ['status', 'state', 'publish_status'], 'published').toLowerCase();
      const resolvedStatus: 'draft' | 'published' =
        defaultStatusOverride === 'published'
          ? 'published'
          : defaultStatusOverride === 'draft'
            ? 'draft'
            : rawStatus === 'draft'
              ? 'draft'
              : 'published';

      const heroHeading = pickField(row, ['hero_heading', 'heading', 'hero_title', 'h1'], title);
      const heroSubheading = pickField(
        row,
        ['hero_subheading', 'subheading', 'subtitle', 'hero_subtitle'],
        `Explore ${title} on ${siteName}.`
      );
      const bodyContent = pickField(
        row,
        ['body_content', 'content', 'body', 'description', 'text'],
        `Comprehensive overview and interactive components for ${title}.`
      );
      const ctaLabel = pickField(row, ['cta_label', 'cta_text', 'button_text', 'button_label'], 'Explore Next Page');
      const rawLinkTo = pickField(row, ['link_to', 'cta_link', 'target_slug', 'linked_pages', 'links']);
      const linkTargets = rawLinkTo
        .split(/[|,;]/)
        .map(s => normalizeSlug(s))
        .filter(Boolean);

      const metaTitle = pickField(row, ['meta_title', 'seo_title'], `${title} | ${siteName}`);
      const metaDescription = pickField(row, ['meta_description', 'seo_description'], heroSubheading);
      const keywords = pickField(row, ['keywords', 'seo_keywords', 'tags'], `${slug}, ${siteName.toLowerCase()}`);
      const rewriteFrom = pickField(row, ['rewrite_from', 'old_url', 'legacy_path', 'redirect_from']);
      const bgColor = pickField(row, ['bg_color', 'background_color', 'background'], 'ffffff').replace(/^#/, '');
      const rawItems = pickField(row, ['items', 'features', 'list_items', 'options']);
      const itemsList = rawItems
        ? rawItems.split('|').map(i => i.trim()).filter(Boolean)
        : [
            `Automated architecture for ${title}`,
            `Seamless UTF-8 data synchronization`,
            `Connected inter-page navigation & SEO metadata`
          ];

      // Determine component specification(s) from this row
      const singleComponentType = pickField(row, ['component_type', 'block_type', 'section_type']);
      const multiComponentsList = pickField(row, ['components', 'blocks', 'sections'], singleComponentType ? '' : 'nav|hero|features|cta');
      const sectionName = pickField(row, ['section_name', 'section_title'], '');

      const componentTypesToCreate: string[] = singleComponentType
        ? [singleComponentType.toLowerCase()]
        : multiComponentsList
            .split(/[|,]/)
            .map(c => c.trim().toLowerCase())
            .filter(Boolean);

      const existingPage = pages.find(p => p.slug === slug);
      let blueprint = blueprintMap.get(slug);

      if (!blueprint) {
        blueprint = {
          rowIndices: [rowNum],
          title,
          slug,
          parentSlug,
          status: resolvedStatus,
          metaTitle,
          metaDescription,
          keywords,
          rewriteFrom,
          linkTargets: [...linkTargets],
          components: [],
          existingPageId: existingPage?.id,
          validationWarnings: []
        };
        blueprintMap.set(slug, blueprint);
      } else {
        blueprint.rowIndices.push(rowNum);
        linkTargets.forEach(lt => {
          if (!blueprint!.linkTargets.includes(lt)) {
            blueprint!.linkTargets.push(lt);
          }
        });
        if (!blueprint.parentSlug && parentSlug) blueprint.parentSlug = parentSlug;
        if (!blueprint.rewriteFrom && rewriteFrom) blueprint.rewriteFrom = rewriteFrom;
      }

      componentTypesToCreate.forEach((compType, compIdx) => {
        if (compType === 'nav' && !autoInjectNavHeader) return;
        // Avoid duplicate nav blocks on the same page
        if (compType === 'nav' && blueprint!.components.some(c => c.type === 'nav')) return;

        blueprint!.components.push({
          id: `spec_${slug}_${blueprint!.components.length + 1}_${compIdx}`,
          type: compType,
          sectionLabel:
            sectionName ||
            `${compType.charAt(0).toUpperCase() + compType.slice(1)} Section`,
          heading: heroHeading,
          subheading: heroSubheading,
          body: bodyContent,
          ctaLabel,
          linkToSlug: linkTargets[0] || parentSlug || 'home',
          bgColor: bgColor || 'ffffff',
          items: itemsList,
          price: heroSubheading.startsWith('$') ? heroSubheading.replace(/[^0-9.]/g, '') : '49',
          planName: heroHeading
        });
      });
    });

    const blueprints = Array.from(blueprintMap.values());
    const allKnownSlugs = new Set<string>([
      ...pages.map(p => p.slug),
      ...blueprints.map(b => b.slug)
    ]);

    // Build inter-page link edges & validate broken links
    const linkEdges: Array<{ fromSlug: string; toSlug: string; relation: 'cta' | 'parent' | 'child'; exists: boolean }> = [];

    blueprints.forEach(bp => {
      if (bp.parentSlug) {
        const parentExists = allKnownSlugs.has(bp.parentSlug);
        linkEdges.push({
          fromSlug: bp.slug,
          toSlug: bp.parentSlug,
          relation: 'parent',
          exists: parentExists
        });
        if (!parentExists) {
          bp.validationWarnings.push(`Parent slug "/${bp.parentSlug}" is not in CSV or existing pages (will still link to /#/p/${bp.parentSlug}).`);
        }
      }

      bp.linkTargets.forEach(targetSlug => {
        if (targetSlug && targetSlug !== bp.slug) {
          const targetExists = allKnownSlugs.has(targetSlug);
          linkEdges.push({
            fromSlug: bp.slug,
            toSlug: targetSlug,
            relation: 'cta',
            exists: targetExists
          });
          if (!targetExists) {
            bp.validationWarnings.push(`Target link "/${targetSlug}" is not in CSV or existing pages.`);
          }
        }
      });
    });

    return { headers, rows, blueprints, parseErrors, linkEdges };
  }, [csvText, pages, siteName, defaultStatusOverride, autoInjectNavHeader]);

  // Build actual CMS Section[] for a blueprint, wiring all inter-page links
  const buildPageSectionsFromBlueprint = (
    bp: ParsedPageBlueprint,
    allBlueprints: ParsedPageBlueprint[]
  ): Section[] => {
    const sections: Section[] = [];
    const uid = () => Math.random().toString(36).substring(2, 9);

    // Find related pages (parent, children in CSV or CMS, and explicit linkTargets)
    const childBlueprints = allBlueprints.filter(other => other.parentSlug === bp.slug && other.slug !== bp.slug);
    const siblingBlueprints = allBlueprints.filter(
      other => bp.parentSlug && other.parentSlug === bp.parentSlug && other.slug !== bp.slug
    );

    // Build shared navigation links across the CSV batch + Home
    const navLinks: Array<{ label: string; url: string }> = [
      { label: 'Home', url: '/#/p/home' }
    ];
    allBlueprints.slice(0, 6).forEach(item => {
      if (!navLinks.some(l => l.url === `/#/p/${item.slug}`)) {
        navLinks.push({
          label: item.title.length > 22 ? item.title.slice(0, 20) + '…' : item.title,
          url: `/#/p/${item.slug}`
        });
      }
    });

    // If autoInjectNavHeader is enabled and no explicit 'nav' component was added, prepend one
    const hasExplicitNav = bp.components.some(c => c.type === 'nav');
    if (autoInjectNavHeader && !hasExplicitNav) {
      sections.push({
        id: `sec_nav_${uid()}`,
        type: 'Header Navigation',
        styles: { backgroundColor: '#ffffff', padding: '16px 0' },
        blocks: [
          {
            id: `blk_nav_${uid()}`,
            type: 'nav',
            content: {
              logo: siteName || 'DevInquire',
              logoType: 'text',
              showLogo: true,
              links: navLinks
            },
            styles: { textAlign: 'left' }
          }
        ]
      });
    }

    bp.components.forEach(spec => {
      const targetSlug = spec.linkToSlug || bp.linkTargets[0] || bp.parentSlug || 'home';
      const targetBlueprint = allBlueprints.find(b => b.slug === targetSlug);
      const targetExistingPage = pages.find(p => p.slug === targetSlug);
      const targetTitle = targetBlueprint?.title || targetExistingPage?.title || targetSlug;
      const targetHref = `/#/p/${targetSlug}`;

      switch (spec.type) {
        case 'nav': {
          sections.push({
            id: `sec_${uid()}`,
            type: 'Navigation Header',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '16px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'nav',
                content: {
                  logo: spec.heading || siteName || 'DevInquire',
                  logoType: 'text',
                  showLogo: true,
                  links: navLinks
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'hero': {
          const parentBreadcrumbHtml = bp.parentSlug
            ? `<div style="margin-bottom:12px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2563eb;">
                 <a href="/#/p/${bp.parentSlug}" style="color:#2563eb;text-decoration:none;">← ${bp.parentSlug.toUpperCase()}</a>
                 <span style="color:#94a3b8;margin:0 8px;">/</span>
                 <span style="color:#475569;">${bp.slug.toUpperCase()}</span>
               </div>`
            : '';

          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Hero Section',
            styles: { backgroundColor: `#${spec.bgColor === 'ffffff' ? 'f8fafc' : spec.bgColor}`, padding: '64px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'text',
                content: `${parentBreadcrumbHtml}<h1 style="font-size:2.5rem;font-weight:800;color:#0f172a;line-height:1.15;margin-bottom:16px;">${spec.heading}</h1><p style="font-size:1.15rem;color:#475569;max-width:720px;margin:0 auto 20px auto;line-height:1.6;">${spec.subheading}</p><p style="font-size:0.95rem;color:#64748b;max-width:680px;margin:0 auto;">${spec.body}</p>`,
                styles: { textAlign: 'center' }
              },
              {
                id: `blk_${uid()}`,
                type: 'html',
                content: `<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:24px;">
                  <a href="${targetHref}" style="display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#ffffff;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;box-shadow:0 4px 12px rgba(37,99,235,0.25);">
                    <span>${spec.ctaLabel || `Go to ${targetTitle}`}</span>
                    <span>→</span>
                  </a>
                  ${
                    bp.parentSlug
                      ? `<a href="/#/p/${bp.parentSlug}" style="display:inline-flex;align-items:center;gap:8px;background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;font-weight:700;font-size:14px;padding:12px 20px;border-radius:10px;text-decoration:none;">
                           <span>Parent: /${bp.parentSlug}</span>
                         </a>`
                      : ''
                  }
                </div>`,
                styles: { textAlign: 'center' }
              }
            ]
          });
          break;
        }

        case 'features':
        case 'list': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Features & Capabilities',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'text',
                content: `<h2 style="font-size:1.75rem;font-weight:800;color:#0f172a;margin-bottom:8px;">Key Highlights — ${bp.title}</h2><p style="color:#64748b;font-size:0.95rem;margin-bottom:16px;">${spec.body}</p>`,
                styles: { textAlign: 'left' }
              },
              {
                id: `blk_${uid()}`,
                type: 'list',
                content: {
                  items: spec.items.map(text => ({
                    icon: 'Check',
                    text
                  }))
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'pricing': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Pricing Tier',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'pricing',
                content: {
                  plan: spec.planName || `${bp.title} Pro`,
                  currency: '$',
                  price: spec.price || '49',
                  period: 'month',
                  isFeatured: true,
                  buttonText: spec.ctaLabel || 'Get Started Now',
                  features: spec.items
                },
                styles: { textAlign: 'center' }
              }
            ]
          });
          break;
        }

        case 'accordion':
        case 'faq': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Frequently Asked Questions',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'text',
                content: `<h2 style="font-size:1.6rem;font-weight:800;color:#0f172a;margin-bottom:12px;">Frequently Asked Questions</h2>`,
                styles: { textAlign: 'left' }
              },
              {
                id: `blk_${uid()}`,
                type: 'accordion',
                content: [
                  {
                    title: `How does ${bp.title} integrate with other pages?`,
                    content: `${bp.title} is automatically linked to /${targetSlug} and synchronized across the site sitemap and navigation bars.`,
                    isOpen: true
                  },
                  {
                    title: 'Can I customize these components visually?',
                    content: 'Yes! Open this page in the Visual Editor or Experience Manager to edit any text, style, or block layout inline.',
                    isOpen: false
                  }
                ],
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'tabs': {
          const parsedTabs = spec.items.some(i => i.includes(';'))
            ? spec.items.join('|').split(';').map(pair => {
                const [tTitle, tBody] = pair.split('|');
                return {
                  title: (tTitle || 'Overview').trim(),
                  content: (tBody || spec.body).trim()
                };
              })
            : [
                { title: 'Overview', content: spec.body },
                { title: 'Architecture & Links', content: `Connected directly to /${targetSlug} (${targetTitle}) with automated routing.` },
                { title: 'Implementation', content: spec.subheading }
              ];

          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Interactive Tabs',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '44px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'tabs',
                content: {
                  activeTab: 0,
                  tabs: parsedTabs
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'counter':
        case 'stats': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Impact Metrics',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '36px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'counter',
                content: {
                  prefix: '',
                  number: spec.heading.match(/\d/) ? spec.heading : '99.9%',
                  suffix: '',
                  label: spec.subheading || `${bp.title} Reliability Index`
                },
                styles: { textAlign: 'center' }
              }
            ]
          });
          break;
        }

        case 'testimonial': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Customer Testimonial',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '44px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'testimonial',
                content: {
                  quote: spec.heading || spec.body,
                  author: spec.subheading.split('·')[0]?.trim() || 'Alex Rivera',
                  role: spec.subheading.split('·')[1]?.trim() || `Lead Architect · ${siteName}`
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'form': {
          const customFields = spec.items
            .filter(item => item.includes(':'))
            .map((item, idx) => {
              const [label, type, req] = item.split(':');
              return {
                id: `field_${idx + 1}`,
                label: label.trim(),
                type: (type || 'text').trim(),
                placeholder: `Enter ${label.trim().toLowerCase()}...`,
                required: req ? req.trim() === 'true' : true
              };
            });

          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Interactive Form',
            styles: { backgroundColor: `#${spec.bgColor || 'f8fafc'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'form',
                content: {
                  title: spec.heading || `Get in Touch — ${bp.title}`,
                  description: spec.subheading || spec.body,
                  buttonText: spec.ctaLabel || 'Submit Inquiry',
                  fields:
                    customFields.length > 0
                      ? customFields
                      : [
                          { id: 'f_name', label: 'Full Name', type: 'text', placeholder: 'Ada Lovelace', required: true },
                          { id: 'f_email', label: 'Work Email', type: 'email', placeholder: 'ada@company.com', required: true },
                          { id: 'f_msg', label: 'Project Requirements', type: 'textarea', placeholder: 'Tell us about your goals...', required: false }
                        ]
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'alert': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Callout Notice',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '24px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'alert',
                content: {
                  type: 'info',
                  title: spec.heading || 'Important Note',
                  message: spec.body
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'newsletter': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Newsletter Signup',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'newsletter',
                content: {
                  title: spec.heading || `Stay Updated on ${bp.title}`,
                  description: spec.subheading,
                  placeholder: 'Enter your email address...',
                  buttonText: spec.ctaLabel || 'Subscribe'
                },
                styles: { textAlign: 'center' }
              }
            ]
          });
          break;
        }

        case 'sitemap': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Connected Site Directory',
            styles: { backgroundColor: `#${spec.bgColor || 'f8fafc'}`, padding: '48px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'sitemap',
                content: {
                  title: `Explore Connected Pages & Directory`,
                  layout: 'grid',
                  showDrafts: true,
                  showHome: true
                },
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }

        case 'cta': {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Call to Action',
            styles: { backgroundColor: '#0f172a', padding: '56px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'html',
                content: `<div style="text-align:center;color:#ffffff;padding:8px 16px;">
                  <p style="font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;color:#60a5fa;margin-bottom:8px;">NEXT STEP IN WORKFLOW</p>
                  <h2 style="font-size:1.85rem;font-weight:800;margin-bottom:12px;color:#ffffff;">Ready to explore ${targetTitle}?</h2>
                  <p style="font-size:0.95rem;color:#cbd5e1;max-width:600px;margin:0 auto 24px auto;">Continue your journey seamlessly across our linked pages.</p>
                  <a href="${targetHref}" style="display:inline-flex;align-items:center;gap:8px;background:#3b82f6;color:#ffffff;font-weight:700;font-size:14px;padding:12px 28px;border-radius:10px;text-decoration:none;">
                    <span>${spec.ctaLabel || `Continue to ${targetTitle}`}</span>
                    <span>→</span>
                  </a>
                </div>`,
                styles: { textAlign: 'center' }
              }
            ]
          });
          break;
        }

        default: {
          sections.push({
            id: `sec_${uid()}`,
            type: spec.sectionLabel || 'Content Section',
            styles: { backgroundColor: `#${spec.bgColor || 'ffffff'}`, padding: '40px 0' },
            blocks: [
              {
                id: `blk_${uid()}`,
                type: 'text',
                content: `<h2 style="font-size:1.5rem;font-weight:700;color:#0f172a;margin-bottom:10px;">${spec.heading}</h2><p style="color:#475569;line-height:1.65;">${spec.body}</p>`,
                styles: { textAlign: 'left' }
              }
            ]
          });
          break;
        }
      }
    });

    // Automatically inject an Inter-Page Hub / Related Links section so parent, child, sibling, and CTA target pages are linked
    if (autoInjectRelatedLinksSection) {
      const relatedLinksMap = new Map<string, { slug: string; title: string; badge: string }>();

      if (bp.parentSlug && bp.parentSlug !== bp.slug) {
        const parentBp = allBlueprints.find(b => b.slug === bp.parentSlug);
        const parentPage = pages.find(p => p.slug === bp.parentSlug);
        relatedLinksMap.set(bp.parentSlug, {
          slug: bp.parentSlug,
          title: parentBp?.title || parentPage?.title || bp.parentSlug,
          badge: 'Parent Page'
        });
      }

      bp.linkTargets.forEach(lt => {
        if (lt && lt !== bp.slug) {
          const targetBp = allBlueprints.find(b => b.slug === lt);
          const targetPage = pages.find(p => p.slug === lt);
          relatedLinksMap.set(lt, {
            slug: lt,
            title: targetBp?.title || targetPage?.title || lt,
            badge: 'Linked Destination'
          });
        }
      });

      childBlueprints.forEach(child => {
        if (!relatedLinksMap.has(child.slug)) {
          relatedLinksMap.set(child.slug, {
            slug: child.slug,
            title: child.title,
            badge: 'Child Subpage'
          });
        }
      });

      siblingBlueprints.slice(0, 3).forEach(sib => {
        if (!relatedLinksMap.has(sib.slug)) {
          relatedLinksMap.set(sib.slug, {
            slug: sib.slug,
            title: sib.title,
            badge: 'Related Page'
          });
        }
      });

      const relatedItems = Array.from(relatedLinksMap.values());
      if (relatedItems.length > 0) {
        const cardsHtml = relatedItems
          .map(
            item => `<a href="/#/p/${item.slug}" style="display:block;padding:16px;border-radius:12px;border:1px solid #e2e8f0;background:#ffffff;text-decoration:none;transition:all 0.2s;">
              <div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:0.08em;color:#2563eb;margin-bottom:4px;">${item.badge}</div>
              <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:4px;">${item.title}</div>
              <div style="font-size:12px;font-family:monospace;color:#64748b;">/#/p/${item.slug} →</div>
            </a>`
          )
          .join('');

        sections.push({
          id: `sec_links_${uid()}`,
          type: 'Connected Pages & Navigation Links',
          styles: { backgroundColor: '#f8fafc', padding: '40px 0' },
          blocks: [
            {
              id: `blk_links_${uid()}`,
              type: 'html',
              content: `<div>
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                  <h3 style="font-size:16px;font-weight:800;color:#0f172a;margin:0;">Connected Pages in Architecture</h3>
                  <span style="font-size:11px;color:#64748b;font-weight:600;">Auto-linked via UTF-8 CSV</span>
                </div>
                <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px;">
                  ${cardsHtml}
                </div>
              </div>`,
              styles: { textAlign: 'left' }
            }
          ]
        });
      }
    }

    return sections;
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setFileName(file.name);
    setSelectedPresetKey('custom');
    const reader = new FileReader();
    reader.onload = e => {
      const content = e.target?.result;
      if (typeof content === 'string') {
        setCsvText(content);
        setExecutionReport(null);
        toast.success(`Loaded UTF-8 CSV file "${file.name}"`);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to read CSV file. Please ensure it is UTF-8 encoded.');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDownloadSampleCsv = () => {
    // Prefix with UTF-8 BOM (\uFEFF) so Excel / Numbers / Google Sheets recognize UTF-8 encoding automatically
    const bomCsv = '\uFEFF' + csvText;
    const blob = new Blob([bomCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'cms-page-automation-utf8.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded UTF-8 CSV (${fileName})`);
  };

  const handleExecuteAutomation = async () => {
    if (!canManage) {
      toast.error('You need Site Settings or Pages Manage permission to run CSV page automation.');
      return;
    }

    if (parsedResult.blueprints.length === 0) {
      toast.error('No valid page rows found in the CSV to import.');
      return;
    }

    setIsRunningAutomation(true);
    try {
      const now = new Date().toISOString();
      const createdPages: Page[] = [];
      const updatedPages: Page[] = [];
      const skippedSlugs: string[] = [];
      const createdRewrites: URLRewrite[] = [];
      let totalComponentsCreated = 0;

      const nextPagesMap = new Map<string, Page>();
      pages.forEach(p => nextPagesMap.set(p.id, p));

      for (const bp of parsedResult.blueprints) {
        const existingPage = Array.from(nextPagesMap.values()).find(p => p.slug === bp.slug);

        if (existingPage && conflictStrategy === 'skip') {
          skippedSlugs.push(bp.slug);
          continue;
        }

        const sections = buildPageSectionsFromBlueprint(bp, parsedResult.blueprints);
        const blockCount = sections.reduce((sum, s) => sum + (s.blocks?.length || 0), 0);
        totalComponentsCreated += blockCount;

        if (existingPage && conflictStrategy === 'update') {
          const basePage = ensurePageBaselineVersion(existingPage, authorName);
          const updatedCandidate: Page = {
            ...basePage,
            title: bp.title,
            status: bp.status,
            updatedAt: now,
            seo: {
              ...basePage.seo,
              metaTitle: bp.metaTitle,
              metaDescription: bp.metaDescription,
              keywords: bp.keywords
            },
            layoutJSON: {
              layoutVersion: '1.0',
              sections
            }
          };
          const withVersion = appendPageVersion(
            updatedCandidate,
            `CSV Automation Update (${fileName})`,
            authorName,
            `Updated ${sections.length} sections (${blockCount} components) and linked ${bp.linkTargets.length} target page(s) via UTF-8 CSV.`
          );
          nextPagesMap.set(withVersion.id, withVersion);
          updatedPages.push(withVersion);
          await syncPage(withVersion);
        } else {
          // Create new page (or duplicate slug if conflictStrategy === 'duplicate')
          let finalSlug = bp.slug;
          if (existingPage && conflictStrategy === 'duplicate') {
            finalSlug = `${bp.slug}-${Math.random().toString(36).substring(2, 5)}`;
          }
          const newPageId = `p_${Math.random().toString(36).substring(2, 10)}`;
          const newPageRaw: Page = {
            id: newPageId,
            title: bp.title,
            slug: finalSlug,
            status: bp.status,
            author: authorName,
            createdAt: now,
            updatedAt: now,
            seo: {
              metaTitle: bp.metaTitle,
              metaDescription: bp.metaDescription,
              keywords: bp.keywords
            },
            layoutJSON: {
              layoutVersion: '1.0',
              sections
            }
          };
          const newPageWithVersion = ensurePageBaselineVersion(newPageRaw, authorName);
          nextPagesMap.set(newPageWithVersion.id, newPageWithVersion);
          createdPages.push(newPageWithVersion);
          await syncPage(newPageWithVersion);
        }

        // Handle optional URL Rewrite creation
        if (autoCreateUrlRewrites && bp.rewriteFrom) {
          const cleanSource = bp.rewriteFrom.startsWith('/') ? bp.rewriteFrom : `/${bp.rewriteFrom}`;
          const targetPath = `/p/${bp.slug}`;
          const alreadyExists = rewrites.some(r => r.sourcePath === cleanSource && r.targetPath === targetPath);
          if (!alreadyExists) {
            const newRewrite: URLRewrite = {
              id: `rw_${Math.random().toString(36).substring(2, 9)}`,
              sourcePath: cleanSource,
              targetPath,
              type: '301',
              isActive: true,
              description: `CSV Automation redirect to ${bp.title} (/${bp.slug})`,
              createdAt: now
            };
            createdRewrites.push(newRewrite);
            await syncRewrite(newRewrite);
          }
        }
      }

      setPages(Array.from(nextPagesMap.values()));
      if (createdRewrites.length > 0) {
        setRewrites(prev => [...createdRewrites, ...prev]);
      }

      const report: AutomationExecutionReport = {
        timestamp: now,
        fileName,
        createdPages,
        updatedPages,
        skippedSlugs,
        createdRewrites,
        totalComponentsCreated,
        totalLinksWired: parsedResult.linkEdges.length
      };
      setExecutionReport(report);

      toast.success(
        `CSV Automation complete: ${createdPages.length} created, ${updatedPages.length} updated, ${totalComponentsCreated} components linked!`
      );
    } catch (err) {
      console.error('CSV Automation Error:', err);
      toast.error('An error occurred while running CSV automation.');
    } finally {
      setIsRunningAutomation(false);
    }
  };

  const activePreviewBlueprint = useMemo(() => {
    if (previewSelectedSlug) {
      return parsedResult.blueprints.find(b => b.slug === previewSelectedSlug) || parsedResult.blueprints[0] || null;
    }
    return parsedResult.blueprints[0] || null;
  }, [parsedResult.blueprints, previewSelectedSlug]);

  const totalPlannedComponents = useMemo(
    () => parsedResult.blueprints.reduce((acc, b) => acc + b.components.length + (autoInjectRelatedLinksSection ? 1 : 0), 0),
    [parsedResult.blueprints, autoInjectRelatedLinksSection]
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Top Banner & Summary Metrics */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                <FileSpreadsheet size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                    UTF-8 CSV Page & Component Automation
                  </h3>
                  <span className="text-[11px] font-mono font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                    RFC 4180 · UTF-8
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Bulk-generate pages, assemble structured sections & components, and automatically wire parent-child hierarchies, navigation menus, and CTA links from a UTF-8 CSV file.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleDownloadSampleCsv}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              <Download size={14} />
              <span>Export Current UTF-8 CSV</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50/70 hover:bg-blue-100/80 text-blue-700 text-xs font-bold transition-all"
            >
              <Upload size={14} />
              <span>Upload UTF-8 .CSV</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={isRunningAutomation || parsedResult.blueprints.length === 0 || !canManage}
              onClick={handleExecuteAutomation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
            >
              {isRunningAutomation ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )}
              <span>
                Run Automation ({parsedResult.blueprints.length} Pages · {totalPlannedComponents} Components)
              </span>
            </button>
          </div>
        </div>

        {/* High-Density Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pages Detected</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {parsedResult.blueprints.length}
              </span>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                {parsedResult.rows.length} CSV rows
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Components Queued</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {totalPlannedComponents}
              </span>
              <span className="text-[11px] font-mono text-blue-600 tabular-nums">
                Auto-layout v1.0
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inter-Page Links</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {parsedResult.linkEdges.length}
              </span>
              <span className="text-[11px] font-mono text-emerald-600 tabular-nums">
                {parsedResult.linkEdges.filter(e => e.exists).length} resolved
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">URL Rewrites</div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-slate-900 font-mono tabular-nums">
                {parsedResult.blueprints.filter(b => Boolean(b.rewriteFrom)).length}
              </span>
              <span className="text-[11px] font-mono text-slate-500 tabular-nums">
                301 Redirects
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Report Banner (Shown right after running automation) */}
      {executionReport && (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-6 space-y-4 animate-in fade-in duration-300">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950">
                  Automation Completed Successfully · {executionReport.createdPages.length + executionReport.updatedPages.length} Linked Pages Ready
                </h4>
                <p className="text-xs text-emerald-800 font-mono tabular-nums">
                  Created: {executionReport.createdPages.length} · Updated: {executionReport.updatedPages.length} · Components Built: {executionReport.totalComponentsCreated} · Inter-Page Links Wired: {executionReport.totalLinksWired} · Rewrites: {executionReport.createdRewrites.length}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setExecutionReport(null)}
              className="text-xs font-bold text-emerald-800 hover:text-emerald-950 px-2.5 py-1 rounded-lg hover:bg-emerald-100"
            >
              Dismiss
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {[...executionReport.createdPages, ...executionReport.updatedPages].map(pg => (
              <div
                key={pg.id}
                className="bg-white rounded-xl border border-emerald-200/90 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900 truncate">{pg.title}</span>
                    <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                      /{pg.slug}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {pg.layoutJSON?.sections?.length || 0} sections · v{pg.versions?.length || 1} snapshot
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => onOpenEditor(pg.id)}
                    title="Open in Visual Editor"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onOpenExperienceManager(pg.id)}
                    title="Inspect in Experience Manager"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                  >
                    <Monitor size={14} />
                  </button>
                  <a
                    href={`/#/p/${pg.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Open Public Linked Page"
                    className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                  >
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSV Source Input + Presets + Automation Rules */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: File Dropzone & Preset Selector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900">1. UTF-8 CSV Data Source</h4>
              <span className="text-[11px] font-mono text-slate-500 truncate max-w-[180px]">{fileName}</span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              onDragOver={e => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDraggingOver(false);
                const droppedFile = e.dataTransfer.files?.[0];
                if (droppedFile) handleFileUpload(droppedFile);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                isDraggingOver
                  ? 'border-blue-500 bg-blue-50/60'
                  : 'border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-slate-50'
              }`}
            >
              <Upload size={22} className="mx-auto text-blue-600 mb-2" />
              <p className="text-xs font-bold text-slate-800">
                Drop your UTF-8 <span className="font-mono">.csv</span> file here, or click to browse
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Supports RFC 4180 quoted values, pipe-delimited component lists (<span className="font-mono">nav|hero|features|cta</span>), and multi-row component specs.
              </p>
            </div>

            {/* Built-in UTF-8 Blueprint Presets */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Or Load Ready-to-Run CSV Template
                </label>
                <button
                  type="button"
                  onClick={() => setShowRawCsvEditor(prev => !prev)}
                  className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <Code size={12} />
                  <span>{showRawCsvEditor ? 'Hide Raw CSV Editor' : 'Edit Raw UTF-8 CSV'}</span>
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(SAMPLE_CSV_PRESETS).map(([key, preset]) => {
                  const isSelected = selectedPresetKey === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        setSelectedPresetKey(key);
                        setCsvText(preset.csv);
                        setFileName(`${key.replace(/_/g, '-')}-utf8.csv`);
                        setExecutionReport(null);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900">{preset.name}</span>
                        <span className="text-[10px] font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded shrink-0">
                          {preset.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {showRawCsvEditor && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Live UTF-8 CSV Source Editor
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(csvText);
                      toast.success('Copied CSV source to clipboard');
                    }}
                    className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
                  >
                    <Copy size={11} />
                    <span>Copy CSV</span>
                  </button>
                </div>
                <textarea
                  value={csvText}
                  onChange={e => {
                    setCsvText(e.target.value);
                    setSelectedPresetKey('custom');
                  }}
                  spellCheck={false}
                  className="w-full h-56 font-mono text-xs bg-slate-900 text-slate-100 p-3.5 rounded-xl border border-slate-800 focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                  placeholder="Paste UTF-8 CSV rows here..."
                />
              </div>
            )}
          </div>

          {/* Linking & Conflict Configuration */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900">2. Auto-Linking & Conflict Rules</h4>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  If Page Slug Already Exists
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'update', label: 'Update + Snapshot' },
                    { id: 'skip', label: 'Skip Existing' },
                    { id: 'duplicate', label: 'New Suffix Slug' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setConflictStrategy(opt.id as any)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                        conflictStrategy === opt.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Page Publish Status
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'from_csv', label: 'Use CSV Column' },
                    { id: 'published', label: 'Force Published' },
                    { id: 'draft', label: 'Force Draft' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDefaultStatusOverride(opt.id as any)}
                      className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all ${
                        defaultStatusOverride === opt.id
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 space-y-2.5 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoInjectNavHeader}
                    onChange={e => setAutoInjectNavHeader(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Connect Shared Top Navigation Bar
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Automatically populates <span className="font-mono">nav</span> component links across all imported pages.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoInjectRelatedLinksSection}
                    onChange={e => setAutoInjectRelatedLinksSection(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Inject Connected Architecture Footer Cards
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Links each page to its <span className="font-mono">parent_slug</span>, child subpages, and <span className="font-mono">link_to</span> CTA targets.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoCreateUrlRewrites}
                    onChange={e => setAutoCreateUrlRewrites(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <div className="text-xs font-bold text-slate-800">
                      Generate 301 URL Rewrites from <span className="font-mono">rewrite_from</span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Automatically registers legacy route redirects in the URL Rewrite engine.
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Parsed Page Table, Component Pipeline & Link Graph Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  3. Parsed Pages, Components & Auto-Linking Blueprint
                </h4>
                <p className="text-xs text-slate-500">
                  Click any row below to inspect its generated sections, blocks, and outgoing/incoming page links before running.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg tabular-nums">
                Columns: {parsedResult.headers.length}
              </span>
            </div>

            {parsedResult.parseErrors.length > 0 && (
              <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 space-y-1">
                {parsedResult.parseErrors.map((err, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-amber-600 shrink-0" />
                    <span>{err}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-4">Page & Route</th>
                    <th className="py-2.5 px-3">Hierarchy</th>
                    <th className="py-2.5 px-3">Components Pipeline</th>
                    <th className="py-2.5 px-3">Linked Targets</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {parsedResult.blueprints.map(bp => {
                    const isSelected = activePreviewBlueprint?.slug === bp.slug;
                    const isExisting = Boolean(bp.existingPageId);
                    return (
                      <tr
                        key={bp.slug}
                        onClick={() => setPreviewSelectedSlug(bp.slug)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{bp.title}</div>
                          <div className="text-[11px] font-mono text-blue-600">/#/p/{bp.slug}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px]">
                          {bp.parentSlug ? (
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              <GitBranch size={11} />/{bp.parentSlug}
                            </span>
                          ) : (
                            <span className="text-slate-400">root</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {bp.components.map((c, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200/80 text-[10px] font-mono font-semibold text-slate-700"
                              >
                                {c.type}
                              </span>
                            ))}
                            {autoInjectRelatedLinksSection && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200 text-[10px] font-mono font-semibold text-blue-700">
                                +links-hub
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {bp.linkTargets.length > 0 ? (
                              bp.linkTargets.map(lt => (
                                <span
                                  key={lt}
                                  className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded"
                                >
                                  <ArrowRight size={10} />/{lt}
                                </span>
                              ))
                            ) : (
                              <span className="text-[11px] text-slate-400">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[11px]">
                          {isExisting ? (
                            <span className="text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-sans font-bold">
                              {conflictStrategy === 'update'
                                ? 'Update'
                                : conflictStrategy === 'skip'
                                  ? 'Skip'
                                  : 'Duplicate'}
                            </span>
                          ) : (
                            <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-sans font-bold">
                              Create New
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {parsedResult.blueprints.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 text-xs">
                        No valid rows found. Upload a UTF-8 CSV file or choose a preset on the left.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Selected Page Component & Link Inspector */}
          {activePreviewBlueprint && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      Blueprint Inspector
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      CSV Row(s): {activePreviewBlueprint.rowIndices.join(', ')}
                    </span>
                  </div>
                  <h5 className="text-base font-bold text-slate-900 mt-0.5">
                    {activePreviewBlueprint.title}{' '}
                    <span className="font-mono text-xs font-normal text-slate-500">
                      (/#/p/{activePreviewBlueprint.slug})
                    </span>
                  </h5>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono">
                  {activePreviewBlueprint.rewriteFrom && (
                    <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-200">
                      301: {activePreviewBlueprint.rewriteFrom} → /p/{activePreviewBlueprint.slug}
                    </span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700">
                    Status: {activePreviewBlueprint.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Generated Sections & Linked Components ({activePreviewBlueprint.components.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activePreviewBlueprint.components.map((comp, idx) => (
                    <div
                      key={comp.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">
                          {idx + 1}. {comp.sectionLabel}
                        </span>
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-white border border-slate-200 text-blue-600">
                          {comp.type}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-700 truncate">{comp.heading}</p>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{comp.body || comp.subheading}</p>
                      {comp.linkToSlug && (
                        <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-blue-600">
                          <LinkIcon size={11} />
                          <span>
                            CTA "{comp.ctaLabel}" → /#/p/{comp.linkToSlug}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* SEO Metadata Summary */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Meta Title</span>
                  <span className="font-semibold text-slate-800 truncate block">
                    {activePreviewBlueprint.metaTitle}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Meta Description</span>
                  <span className="text-slate-600 truncate block">
                    {activePreviewBlueprint.metaDescription}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Keywords</span>
                  <span className="font-mono text-[11px] text-slate-600 truncate block">
                    {activePreviewBlueprint.keywords}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
