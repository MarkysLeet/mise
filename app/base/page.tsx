import { BookOpen, Search, ShieldAlert, Utensils, Coffee, Wine, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const categories = [
  {
    title: "Guest Relations & Complaints",
    icon: ShieldAlert,
    color: "text-amber-600",
    bgColor: "bg-amber-600/10",
    articles: [
      "Guest refuses to pay the bill",
      "Handling food allergy emergencies",
      "Noise complaints in dining areas",
    ]
  },
  {
    title: "Room Service Protocol",
    icon: Utensils,
    color: "text-primary",
    bgColor: "bg-primary/10",
    articles: [
      "VIP Setup requirements",
      "Maximum delivery times by zone",
      "Tray retrieval process",
    ]
  },
  {
    title: "Bar & Lounge Rules",
    icon: Wine,
    color: "text-purple-600",
    bgColor: "bg-purple-600/10",
    articles: [
      "Broken glass safety procedure",
      "Intoxicated guest protocol",
      "Minibar restocking guidelines",
    ]
  },
  {
    title: "Breakfast & Buffet",
    icon: Coffee,
    color: "text-blue-600",
    bgColor: "bg-blue-600/10",
    articles: [
      "Opening checklist (06:00 AM)",
      "Food temperature logs",
      "Action station setup",
    ]
  }
];

export default function BasePage() {
  return (
    <div className="flex flex-col gap-8 h-full max-w-6xl mx-auto pb-10">
      {/* Header */}
      <header className="flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Bilgi Bankası</h1>
            <p className="text-muted-foreground mt-1">Official hotel knowledge base and standard operating procedures.</p>
          </div>
        </div>

        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input 
            placeholder="Search policies, rules, or guidelines..." 
            className="pl-12 h-14 bg-card border-none shadow-sm rounded-2xl text-base"
          />
        </div>
      </header>

      {/* Categories Grid */}
      <div className="grid grid-cols-2 gap-6 mt-4">
        {categories.map((category, idx) => (
          <Card key={idx} className="border-none shadow-sm rounded-2xl overflow-hidden flex flex-col">
            <CardHeader className="pb-4 bg-stone-50/30 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${category.bgColor} ${category.color} flex items-center justify-center`}>
                  <category.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-lg font-medium">{category.title}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0 flex-1">
              <ul className="flex flex-col">
                {category.articles.map((article, aIdx) => (
                  <li key={aIdx} className="group border-b border-border/50 last:border-0">
                    <a href="#" className="flex items-center justify-between p-4 hover:bg-stone-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        <span className="text-sm font-medium text-foreground">{article}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </CardContent>
            <div className="p-4 border-t border-border/50 bg-stone-50/30 text-center">
              <a href="#" className="text-sm font-medium text-primary hover:underline">View all {category.title} articles</a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
