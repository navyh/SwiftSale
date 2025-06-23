import * as React from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

interface ItemListProps extends React.HTMLAttributes<HTMLDivElement> {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  loadingState?: React.ReactNode;
}

const ItemList = React.forwardRef<HTMLDivElement, ItemListProps>(
  ({ className, items, renderItem, emptyState, isLoading, loadingState, ...props }, ref) => {
    if (isLoading) {
      return loadingState || <div className="py-6 text-center">Loading...</div>;
    }

    if (items.length === 0) {
      return emptyState || <div className="py-6 text-center text-muted-foreground">No items found</div>;
    }

    return (
      <div ref={ref} className={cn("space-y-3", className)} {...props}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }
);

ItemList.displayName = "ItemList";

interface ItemListCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: React.ReactNode;
  amount?: React.ReactNode;
  date?: React.ReactNode;
  actions?: React.ReactNode;
  onClick?: () => void;
}

const ItemListCard = React.forwardRef<HTMLDivElement, ItemListCardProps>(
  ({ className, title, subtitle, status, amount, date, actions, onClick, ...props }, ref) => {
    return (
      <Card 
        ref={ref} 
        className={cn("overflow-hidden", onClick && "cursor-pointer", className)} 
        onClick={onClick}
        {...props}
      >
        <CardContent className="p-0">
          <div className="flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium truncate">{title}</h3>
                  {status && <div className="ml-2">{status}</div>}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-1 truncate">{subtitle}</p>}
              </div>
              {amount && <div className="ml-4 text-sm font-medium">{amount}</div>}
            </div>
            
            <div className="flex items-center justify-between p-4">
              {date && <div className="text-xs text-muted-foreground">{date}</div>}
              <div className="flex items-center space-x-2">
                {actions}
                {onClick && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);

ItemListCard.displayName = "ItemListCard";

export { ItemList, ItemListCard };